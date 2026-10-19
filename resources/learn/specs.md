Irij has no static type checker. Instead it has **specs**: declarations of what a value should look like, checked at run time at the boundaries you choose — when a value is constructed, and when it enters or leaves an annotated function. A wrong value is caught where it crosses the line, with a message that says which line.

## Sum specs: one of several shapes

A spec that lists **variants** says "a value is one of these". Each variant is a capitalised name, optionally followed by the specs of its fields:

```irij
spec Shape
  Circle Float
  Rect Float Float

c := Circle 1.5
r := Rect 2.0 3.0
println c
println r
type-of r
```

Each variant name is a constructor: a function that builds the value. To use one, match on its constructor pattern — it binds the fields in order:

```irij
spec Shape
  Circle Float
  Rect Float Float

fn area
  (Circle r) => pi * r * r
  (Rect w h) => w * h

println (area (Circle 1.0))
println (#[(Circle 1.0) (Rect 2.0 3.0)] |> @ area)
```

A variant can have no fields at all, which makes a tidy enumeration:

```irij
spec Suit
  Hearts
  Diamonds
  Clubs
  Spades

fn colour
  Hearts => "red"
  Diamonds => "red"
  _ => "black"

println (colour Spades)
println (Hearts == Hearts)
```

A spec can take **parameters**, written in lowercase after its name. `Ok` and `Err` are built in this way (the next-but-one lesson uses them); here is a home-made "maybe":

```irij
spec Maybe a
  Just a
  Nothing

fn find-even
  #[] => Nothing
  #[x ...rest] => if (x % 2 == 0) (Just x) else (find-even rest)

println (find-even #[1 3 4 5])
println (find-even #[1 3 5])
```

## Product specs: records with named fields

A spec whose lines are `field :: spec` describes a record. Its constructor takes the fields in order, and the result reads like any map:

```irij
spec User
  name :: Str
  age :: Int

ada := User "Ada" 36
println ada
println ada.name
println (User "Grace" 85)
```

<!-- engine-limit: record-update-on-spec — `{...ada age= 37}` on a product-spec value failed; fixed by irij fix/pattern-gaps (stays a User, re-checked): show it above -->
The fields are checked when the value is built, so a bad record never gets made:

```irij fails
spec User
  name :: Str
  age :: Int

User "Ada" "thirty-six"
```

Product specs are **closed**: a value satisfies `User` only with exactly the declared fields, each of the right spec.

## Annotating functions

`fn name :: In1 In2 Out` declares the specs of the inputs, then the output. They are checked on every call:

```irij
fn word-count :: Str Int
  (s -> length (split s " "))

fn total :: #[Int] Int
  (xs -> fold (acc x -> acc + x) 0 xs)

println (word-count "specs are checked at the boundary")
println (total #[1 2 3 4])
```

```irij fails
fn double :: Int Int
  (n -> n * 2)

double "21"
```

The output is checked too — a function that returns the wrong thing is blamed itself:

```irij fails
fn label :: Int Str
  (n -> n + 1)

label 1
```

The building blocks for annotations:

| Spec | Accepts |
|---|---|
| `Int`, `Float`, `Rational`, `Str`, `Bool`, `Keyword` | that kind of value |
| `Vec`, `Map`, `Set`, `Tuple`, `Fn` | any vector, map, … |
| `#[Int]` | a vector whose every element is an `Int` |
| `Shape`, `User`, … | your own specs |
| `_` | anything — "not decided yet" |

A record literal is accepted wherever a product spec is expected, as long as it has exactly the right fields:

```irij
spec User
  name :: Str
  age :: Int

fn greeting :: User Str
  (u -> "Hi, " ++ u.name)

greeting {name= "Grace" age= 85}
```

Public functions of a module (`pub fn`, lesson 15) must carry an annotation — `_` is fine where you don't want to commit.

## newtype

`newtype Email := Str` makes a one-variant spec `Email` that wraps a `Str`. An `Email` and a plain string are no longer interchangeable, which stops you passing the wrong string to the wrong place:

```irij
newtype Email := Str

fn send-to :: Email Str
  (Email address) => "sending to " ++ address

println (send-to (Email "ada@example.org"))
println (try (-> send-to "ada@example.org"))
```

(`try` turns an error into a value instead of stopping the program — more on it in lesson 10.)

:::exercise perimeter Perimeters
Add a third variant `Triangle` with three `Float` sides to `Shape`, then write `perimeter :: Shape Float`. A circle's perimeter is `2.0 * pi * r`.

```irij starter
spec Shape
  Circle Float
  Rect Float Float

fn perimeter :: Shape Float
  (Circle r) => 2.0 * pi * r
  _ => 0.0
```

```irij solution
spec Shape
  Circle Float
  Rect Float Float
  Triangle Float Float Float

fn perimeter :: Shape Float
  (Circle r) => 2.0 * pi * r
  (Rect w h) => 2.0 * (w + h)
  (Triangle a b c) => a + b + c
```

```irij check
course-check "circle of radius 0.5" (-> perimeter (Circle 0.5)) pi
course-check "rectangle 2 × 3" (-> perimeter (Rect 2.0 3.0)) 10.0
course-check "triangle 3-4-5" (-> perimeter (Triangle 3.0 4.0 5.0)) 12.0
```

```hint
Add `Triangle Float Float Float` as a third line of the spec, and give `perimeter` one arm per variant.
```
:::

:::exercise traffic Traffic lights
Declare a spec `Light` with three variants `Red`, `Green` and `Yellow` (no fields). Then write `next-light :: Light Light`: red turns green, green turns yellow, yellow turns red.

```irij starter
fn next-light
  (light -> light)
```

```irij solution
spec Light
  Red
  Green
  Yellow

fn next-light :: Light Light
  Red => Green
  Green => Yellow
  Yellow => Red
```

```irij check
course-check "red → green" (-> next-light Red) Green
course-check "green → yellow" (-> next-light Green) Yellow
course-check "yellow → red" (-> next-light Yellow) Red
course-check "a full cycle" (-> next-light (next-light (next-light Red))) Red
```
:::

:::exercise safe-head Safe head
`head` fails on an empty vector. Using the `Maybe` spec below, write `safe-head`, which returns `Nothing` for an empty vector and `Just` the first element otherwise.

```irij starter
spec Maybe a
  Just a
  Nothing

fn safe-head
  (xs -> head xs)
```

```irij solution
spec Maybe a
  Just a
  Nothing

fn safe-head
  #[] => Nothing
  #[x ..._] => Just x
```

```irij check
course-check "empty" (-> safe-head #[]) Nothing
course-check "some numbers" (-> safe-head #[3 4]) (Just 3)
course-check "a string" (-> safe-head #["Irij"]) (Just "Irij")
```

```hint
Two arms: the empty vector pattern `#[]`, and `#[x ..._]` for "one or more".
```
:::
