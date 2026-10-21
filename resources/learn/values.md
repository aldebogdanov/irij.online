Irij has a handful of built-in kinds of value. `type-of` names the kind of any value — handy while you explore.

## Numbers

There are three numeric kinds, and none of them loses a value silently.

**`Int`** is a whole number of any size. It never overflows: past 64 bits it simply keeps growing.

```irij
println (9223372036854775807 + 1)
println (2 ** 100)
type-of (2 ** 100)
```

**`Rational`** is an exact fraction, written as digits, a slash and digits with **no spaces**. Rationals stay in lowest terms, and a whole result becomes an `Int` again:

```irij
println (1/3 + 2/3)
println (6/4)
println (1/10 + 2/10 == 3/10)
type-of 2/3
```

**`Float`** is a 64-bit double — fast, and as inexact as doubles are everywhere:

```irij
println (0.1 + 0.2)
println (0.1 + 0.2 == 0.3)
```

A literal with a fraction, an exponent or both is a `Float`. The exponent is `e` (or `E`), an optional sign and digits:

```irij
println 1.5e3
println 2.5e-3
type-of 1e6
```

Mixing kinds takes the wider one: `Int` with `Rational` gives a `Rational`, anything with a `Float` gives a `Float`.

### Division

Between two `Int`s, `/` divides and **truncates** toward zero. It is exact only when a `Rational` (or a `Float`) is involved. `quo` and `rem` are the integer quotient and remainder, `%` is the remainder too, and `**` raises to a power.

```irij
println (7 / 2)
println (7/2)
println (7 / 2.0)
println (quo 17 5)
println (rem 17 5)
println (17 % 5)
```

Spacing matters: `7/2` is the fraction seven halves, `7 / 2` is integer division. When you mean division, put spaces around the slash.

## Text, truth and the rest

```irij
println (type-of "hello")
println (length "hello")
println (upper-case "hello")
println "tab:\there, quote: \", newline:\nnext line"
```

Strings support the escapes `\n \t \r \" \\` and `\$` (a literal dollar sign before `{`).

`Bool` is `true` or `false`. Comparisons are `== /= < > <= >=` — note that "not equal" is **`/=`**. `&&` and `||` short-circuit, and `!` (or `not`) negates:

```irij
println (3 /= 4)
println ("apple" < "banana")
println (1 < 2 && 2 < 3)
println (! true)
```

Two more kinds you'll meet often:

- **Keywords** like `:ok` or `:not-found` — lightweight named constants, equal only to themselves.
- **Unit** `()` — "no value", what `println` returns.

```irij
println (:ok == :ok)
println (type-of :ok)
type-of ()
```

## Bindings

`name := value` binds a name to a value. Names are lowercase and **kebab-case**; a trailing `?` is the convention for yes/no questions, as in the built-in `empty?`.

```irij
width := 8
height := 5
area := width * height
println "The area is ${area}"
```

A `:=` binding is meant to stay put: treat it as a constant. When you really need a value that changes, declare it **mutable** with `:!` and update it with `<-`:

```irij
count :! 0
count <- count + 1
count <- count + 1
count
```

Most Irij code needs very few mutable bindings — the next lessons show how functions, recursion and pipelines replace loops with counters.

:::exercise pizza Exact pizza
A pizza is cut into 8 slices and you eat 3. Bind `eaten` to the fraction you ate and `left` to the fraction that remains, computed from `eaten`. Both must be exact.

The starter has a bug: run it and look at what `eaten` is.

```irij starter
eaten := 3 / 8
left := 1 - eaten
println eaten
println left
```

```irij solution
eaten := 3/8
left := 1 - eaten
println eaten
println left
```

```irij check
course-check "eaten is three eighths" (-> eaten) 3/8
course-check "left is five eighths" (-> left) 5/8
course-check "left is exact" (-> type-of left) "Rational"
```

```hint
`3 / 8` with spaces is integer division, so it is `0`. Write the fraction itself: `3/8`.
```
:::

:::exercise chessboard Grains of rice
A chessboard has 64 squares. One grain of rice goes on the first square, two on the second, four on the third — doubling each time.

Bind `last-square` to the number of grains on square 64 (that is 2 to the power 63) and `total` to the grains on the whole board (2 to the power 64, minus 1).

```irij starter
last-square := 0
total := 0
println last-square
println total
```

```irij solution
last-square := 2 ** 63
total := 2 ** 64 - 1
println last-square
println total
```

```irij check
course-check "grains on square 64" (-> last-square) 9223372036854775808
course-check "grains on the board" (-> total) 18446744073709551615
```

```hint
`**` is the power operator, and `Int` has no upper limit.
```
:::
