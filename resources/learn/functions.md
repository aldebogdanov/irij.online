Functions are declared with `fn`, a name, and an **indented body** on the following lines. Indentation is exactly two spaces per level — Irij reads it as structure, the way Python does.

A body comes in one of three forms. Which one is decided by how its first line starts.

## 1. A lambda body

When the body is a single expression, write it as a lambda: parameters, an arrow `->`, the result.

```irij
fn square
  (n -> n * n)

fn hypotenuse
  (a b -> sqrt (a * a + b * b))

println (square 7)
println (hypotenuse 3.0 4.0)
```

Arguments follow the function, separated by spaces. When an argument is itself a call, wrap it in parentheses — `square (square 2)` — or the call would read as `square` applied to two arguments.

## 2. Match arms

When the answer depends on the shape of the argument, list **arms**: a pattern, `=>`, the result. The first arm that matches wins.

```irij
fn describe
  0 => "zero"
  1 => "one"
  n => "the number " ++ to-str n

println (describe 0)
println (describe 1)
println (describe 42)
```

A name like `n` in a pattern matches anything and binds it. Lesson 4 and lesson 7 do much more with patterns.

## 3. An imperative block

For several steps, start the body with `=>` followed by the parameter names, then write one statement per line. The value of the last line is the result.

```irij
fn bmi
  => kg metres
  squared := metres * metres
  ratio := kg / squared
  round ratio

println (bmi 70.0 1.75)
```

A function with no parameters has `=>` alone on its first line, and is called with `()`:

```irij
fn favourite-number
  =>
  base := 6
  base * 7

favourite-number ()
```

## Lambdas are values

A lambda can stand on its own, anywhere a value can. Bind it to a name, pass it to another function, return it:

```irij
inc := (n -> n + 1)
twice-apply := (f x -> f (f x))

println (inc 1)
println (twice-apply inc 10)
println (twice-apply (s -> s ++ "!") "hey")
```

`(-> expr)` is a lambda that takes no arguments — a *thunk*. You'll use them later to delay work.

## Currying

Give a function fewer arguments than it takes and you get back a function waiting for the rest. This is **partial application**, and it is automatic:

```irij
fn add
  (a b -> a + b)

add-ten := add 10
println (add-ten 5)
println (add-ten 32)
```

Operators are functions too. Wrap one in parentheses to use it as a value:

```irij
plus := (+)
println (plus 2 3)
println ((*) 6 7)
```

## Pipes and composition

`x |> f` means `f x`. A chain of pipes reads in the order things happen:

```irij
fn square
  (n -> n * n)

5 |> square |> (n -> n + 1) |> to-str
```

`f >> g` builds a new function that runs `f`, then `g`:

```irij
fn square
  (n -> n * n)

square-then-show := square >> to-str >> (s -> "result: " ++ s)
println (square-then-show 12)
```

<!-- engine-limit: builtins-as-values — in sandbox/REPL sessions ~70 builtins (trim, upper-case, max…) can only be called; once fixed, compose them directly (`trim >> upper-case`) here and in the slugify exercise -->
Not every built-in can be passed around as a value yet — `trim` and `upper-case`, for example, can only be called. Wrap one in a lambda when you need it as a value: `(s -> upper-case s)`.

Remember `~` from lesson 1? Together these three give you most of Irij's "flat" style: `|>` to push data through steps, `>>` to glue steps together, `~` to avoid wrapping the last argument in parentheses.

:::exercise fahrenheit Temperature
Write `to-fahrenheit`, which converts degrees Celsius to Fahrenheit: multiply by 9/5, then add 32. Keep it exact — `to-fahrenheit 100` should be the `Int` 212.

```irij starter
fn to-fahrenheit
  (c -> c)

println (to-fahrenheit 100)
```

```irij solution
fn to-fahrenheit
  (c -> c * 9/5 + 32)

println (to-fahrenheit 100)
```

```irij check
course-check "boiling" (-> to-fahrenheit 100) 212
course-check "freezing" (-> to-fahrenheit 0) 32
course-check "where the scales meet" (-> to-fahrenheit (-40)) (-40)
```

```hint
`9/5` with no spaces is an exact fraction, so `c * 9/5 + 32` stays exact for any Int `c`.
```
:::

:::exercise twice Do it twice
Write `twice`, which takes a function `f` and a value `x` and applies `f` to `x` two times. Then bind `add-two` to `twice` partially applied to a function that adds one — so `add-two 5` is `7`.

```irij starter
fn twice
  (f x -> f x)

add-two := (n -> n)
```

```irij solution
fn twice
  (f x -> f (f x))

add-two := twice (n -> n + 1)
```

```irij check
course-check "twice triples twice" (-> twice (n -> n * 3) 2) 18
course-check "twice on strings" (-> twice (s -> s ++ "!") "hey") "hey!!"
course-check "add-two 5" (-> add-two 5) 7
course-check "add-two 40" (-> add-two 40) 42
```

```hint
`f (f x)` applies `f` to the result of `f x`. For `add-two`, give `twice` only its first argument.
```
:::

:::exercise slugify Glue with >>
Build `slugify` **by composing** three steps with `>>`: trim surrounding spaces, lower-case the text, then replace every space with a dash. `slugify "  Hello Irij World "` is `"hello-irij-world"`.

`trim`, `lower-case` and `replace` can only be called, so make each step a lambda. `replace` takes the text first: `replace "a b" " " "-"` is `"a-b"`.

```irij starter
slugify := (s -> trim s)

println (slugify "  Hello Irij World ")
```

```irij solution
slugify := (s -> trim s) >> (s -> lower-case s) >> (s -> replace s " " "-")

println (slugify "  Hello Irij World ")
```

```irij check
course-check "slugify a title" (-> slugify "  Hello Irij World ") "hello-irij-world"
course-check "slugify one word" (-> slugify "Effects") "effects"
```

```hint
`(s -> trim s) >> (s -> lower-case s)` is already a function that does the first two steps. Add one more `>>` and a lambda that calls `replace`.
```
:::
