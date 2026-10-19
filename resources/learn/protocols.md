Sometimes one operation makes sense for many kinds of value: "describe it", "compute its area", "combine two of them". A **protocol** names such an operation once; each type then supplies its own **implementation**. When you call the method, Irij looks at the runtime type of the first argument and runs the matching implementation.

## proto and impl

`proto` declares the methods, with a type parameter standing for "the type that implements this". `impl … for …` provides them for one type:

```irij
proto Describe a
  describe :: a -> Str

impl Describe for Int
  describe := (n -> "the integer " ++ to-str n)

impl Describe for Str
  describe := (s -> "a string of length " ++ to-str (length s))

impl Describe for Vector
  describe := (xs -> "a vector of " ++ to-str (length xs) ++ " things")

println (describe 42)
println (describe "hello")
println (describe #[1 2 3])
```

Protocol methods are ordinary functions — pass them around, use them in pipelines:

```irij
proto Describe a
  describe :: a -> Str

impl Describe for Int
  describe := (n -> "int")

impl Describe for Float
  describe := (x -> "float")

impl Describe for Keyword
  describe := (k -> "keyword")

#[1 2.5 :ok 7] |> @ describe
```

Calling a method on a type with no implementation is a run-time error that names the method and the type:

```irij fails
proto Describe a
  describe :: a -> Str

impl Describe for Int
  describe := (n -> "int")

describe "not an int"
```

The built-in type names you can implement for are `Int`, `Float`, `Rational`, `Str`, `Bool`, `Keyword`, `Vector`, `Map`, `Set` and `Tuple` — plus every spec you declare.

## Protocols for your own specs

This is where protocols earn their keep: separate specs, one shared vocabulary.

```irij
spec Square
  side :: Float

spec Circle
  radius :: Float

proto Shape a
  area :: a -> Float
  label :: a -> Str

impl Shape for Square
  area := (s -> s.side * s.side)
  label := (_ -> "square")

impl Shape for Circle
  area := (c -> pi * c.radius * c.radius)
  label := (_ -> "circle")

shapes := #[(Square 2.0) (Circle 1.0) (Square 0.5)]
shapes |> @ (s -> label s ++ ": " ++ to-str (area s))
```

Only values built with the spec's constructor carry its name: `Square 2.0` dispatches to the `Square` impl, while the plain map `{side= 2.0}` is just a `Map`.

An implementation can be any function value — a lambda, the name of a `fn`, or an operator section:

```irij
proto Combine a
  combine :: a -> a -> a

impl Combine for Int
  combine := (+)

impl Combine for Str
  combine := (++)

impl Combine for Vector
  combine := (++)

println (combine 20 22)
println (combine "Ir" "ij")
println (combine #[1 2] #[3])
```

:::exercise describe-more Teach it new types
`Describe` is implemented for `Int`. Add implementations so that:

- `describe "hi"` is `"text: hi"`
- `describe true` is `"yes"` and `describe false` is `"no"`
- `describe #[1 2 3]` is `"3 items"`

```irij starter
proto Describe a
  describe :: a -> Str

impl Describe for Int
  describe := (n -> "number: " ++ to-str n)
```

```irij solution
proto Describe a
  describe :: a -> Str

impl Describe for Int
  describe := (n -> "number: " ++ to-str n)

impl Describe for Str
  describe := (s -> "text: " ++ s)

impl Describe for Bool
  describe := (b -> if b "yes" else "no")

impl Describe for Vector
  describe := (xs -> to-str (length xs) ++ " items")
```

```irij check
course-check "an Int (already done)" (-> describe 7) "number: 7"
course-check "a string" (-> describe "hi") "text: hi"
course-check "true" (-> describe true) "yes"
course-check "false" (-> describe false) "no"
course-check "a vector" (-> describe #[1 2 3]) "3 items"
```

```hint
One `impl Describe for <Type>` block per type: `Str`, `Bool`, `Vector`. For `Bool`, an inline `if b "yes" else "no"` does it.
```
:::

:::exercise total-area Total area
Two specs are declared for you. Implement the `Area` protocol for both — a rectangle's area is width × height, a triangle's is base × height ÷ 2 — then write `total-area`, which adds up the areas of a vector of mixed shapes.

```irij starter
spec Rect
  w :: Float
  h :: Float

spec Tri
  base :: Float
  height :: Float

proto Area a
  area :: a -> Float

fn total-area
  (shapes -> 0.0)
```

```irij solution
spec Rect
  w :: Float
  h :: Float

spec Tri
  base :: Float
  height :: Float

proto Area a
  area :: a -> Float

impl Area for Rect
  area := (r -> r.w * r.h)

impl Area for Tri
  area := (t -> t.base * t.height / 2.0)

fn total-area
  (shapes -> shapes |> @ area |> fold (acc a -> acc + a) 0.0)
```

```irij check
course-check "one rectangle" (-> area (Rect 2.0 3.0)) 6.0
course-check "one triangle" (-> area (Tri 4.0 3.0)) 6.0
course-check "mixed" (-> total-area #[(Rect 2.0 3.0) (Tri 4.0 3.0) (Rect 1.0 1.0)]) 13.0
course-check "nothing" (-> total-area #[]) 0.0
```

```hint
`impl Area for Rect` with `area := (r -> r.w * r.h)`, and the same for `Tri`. Then map `area` over the shapes and fold the results from `0.0`.
```
:::
