Everything so far used built-ins only. Real programs import modules — from the standard library, from packages (Irij calls them *seeds*), and from their own other files — and sometimes reach straight into the Java platform underneath.

## Importing a module

`use` brings a module in. The recommended form gives it a short alias with `:as`, and every name is then written through the alias, so a reader always knows where it came from:

```irij
use std.text :as text
use std.collection :as coll

words := text.words "the cat sat on the mat with the hat"
println (coll.frequencies words)
println (coll.group-by (w -> length w) words)
println (text.pad-left 6 "0" "42")
```

When you use a few names constantly, import them by name with `{ … }` and use them bare:

```irij
use std.collection {zip enumerate}

println (zip #[1 2 3] #["one" "two" "three"])
println (enumerate #["a" "b" "c"])
```

<!-- engine-limit: builtins-as-values — `use std.math` fails in the sandbox ("Unbound variable: sin"), so std.math is left out of this table; add it once fixed -->
A handful of standard modules worth knowing — those marked † need a real machine, not the browser sandbox:

| Module | For |
|---|---|
| `std.text` | `words`, `lines`, `chars`, padding, … |
| `std.collection` | `zip`, `group-by`, `frequencies`, `sort-by`, `distinct`, `flatten`, … |
| `std.func` | `flip`, `compose`, `juxt`, `complement`, … |
| `std.random`, `std.time` | the `Random` and `Time` effects, with default and mockable handlers |
| `std.test` | `test`, `assert-eq`, … for `irij test` |
| `std.fs`† `std.http`† `std.serve`† `std.db`† | files, HTTP client and server, SQLite |

Effects come through imports too. `std.random` declares an effect `Random` with an operation `rand-int` and a real handler `default-random` — and, as you'd now expect, you can swap in your own:

```irij
use std.random :as random

fn roll ::: random.Random
  => sides
  1 + random.rand-int sides

handler always-max :: random.Random
  rand-int bound => resume (bound - 1)
  rand-float => resume 0.5

with random.default-random
  println (roll 6)
with always-max
  println (roll 6)
```

## Writing a module

A file is a module. It starts with `mod` and a dotted name that mirrors its path, and marks what it exports with `pub`. Everything else stays private to the file. Every `pub fn` must carry a spec annotation — `_` where you don't want to commit:

```irij static
;; src/shop/pricing.irj
mod shop.pricing

pub fn with-tax :: Int Int
  (cents -> cents + vat cents)

fn vat
  (cents -> quo (cents * 25) 100)
```

```irij static
;; main.irj
use shop.pricing :as pricing

println (pricing.with-tax 1000)
```

`vat` is invisible outside its file — not even reachable as `pricing.vat`. A project lists its seed dependencies in `irij.toml`; browse what's published at [irij.online/seeds](/seeds).

(The browser sandbox runs one file at a time, so modules of your own are something to try on your machine — see the next lesson.)

## Calling Java

Irij runs on the JVM, and every Java class is one slash away. `Class/member` calls a static method or reads a static field; `Class/new` constructs; `value.method args` calls an instance method. Classes in `java.lang` need no package:

```irij
println (Math/hypot 3.0 4.0)
println (Long/MAX_VALUE)
println (Integer/toBinaryString 42)
println ("irij".toUpperCase ())

date := java.time.LocalDate/of 2026 10 15
println (date.getDayOfWeek ())
println (date.plusDays 30)
```

A method with no arguments still needs `()`. And because `a/b` with no spaces is a Java reference, always put spaces around division: `a / b`.

Java can do anything — read files, open sockets, exit the process — so Irij can't take a Java call on trust. Calling Java is the `JVM` effect, and a function that does it must say so:

```irij fails
fn hypotenuse
  (a b -> Math/hypot a b)

hypotenuse 3.0 4.0
```

```irij
fn hypotenuse ::: JVM
  (a b -> Math/hypot a b)

hypotenuse 3.0 4.0
```

The idiom is to keep Java calls at the edges — inside handlers of your own effects — so the rest of the program stays pure and testable.

:::exercise title-case Title Case
Using `std.text` (imported as `text`), write `title-case`, which capitalises the first letter of every word: `title-case "the effect of effects"` is `"The Effect Of Effects"`. Words are separated by single spaces.

```irij starter
use std.text :as text

fn title-case
  (s -> s)
```

```irij solution
use std.text :as text

fn capitalise
  (w -> upper-case (substring w 0 1) ++ substring w 1 (length w))

fn title-case
  (s -> text.words s |> @ capitalise |> text.unwords)
```

```irij check
course-check "a phrase" (-> title-case "the effect of effects") "The Effect Of Effects"
course-check "one word" (-> title-case "irij") "Irij"
course-check "already capitalised" (-> title-case "Hello World") "Hello World"
```

```hint
`text.words` splits into a vector and `text.unwords` joins one back. For each word: `upper-case (substring w 0 1)` plus the rest, `substring w 1 (length w)`.
```
:::

:::exercise top-word Most frequent word
Using `std.collection`'s `frequencies` (which counts how often each element occurs, as a map from element to count), write `top-word`: the word that occurs most often in a text. Ties can go either way — the checks avoid them.

```irij starter
use std.text :as text
use std.collection :as coll

fn top-word
  (s -> "")
```

```irij solution
use std.text :as text
use std.collection :as coll

fn top-word
  => s
  counts := coll.frequencies (text.words s)
  keys counts |> /^ (best w -> if (get w counts > get best counts) w else best)
```

```irij check
course-check "the cat" (-> top-word "the cat and the hat and the bat") "the"
course-check "a single word" (-> top-word "irij") "irij"
course-check "effects win" (-> top-word "effects specs effects pipelines effects specs") "effects"
```

```hint
`counts := coll.frequencies (text.words s)` gives e.g. `{the= 3 cat= 1 …}`. Reduce its `keys` with `/^`, keeping whichever word has the larger `get word counts`.
```
:::

:::exercise days-between Ask Java
Write `days-until-2030 ::: JVM`, which takes a `java.time.LocalDate` and returns how many days remain until 1 January 2030. `java.time.temporal.ChronoUnit/DAYS` has a method `between` that takes two dates.

```irij starter
fn days-until-2030
  (date -> 0)
```

```irij solution
fn days-until-2030 ::: JVM
  => date
  new-year := java.time.LocalDate/of 2030 1 1
  days := java.time.temporal.ChronoUnit/DAYS
  days.between date new-year
```

```irij check
course-check "from New Year's Eve 2029" (-> days-until-2030 (java.time.LocalDate/of 2029 12 31)) 1
course-check "from 15 October 2026" (-> days-until-2030 (java.time.LocalDate/of 2026 10 15)) 1174
```

```hint
Bind the constant first — `days := java.time.temporal.ChronoUnit/DAYS` — then call `days.between date new-year`, where `new-year` is `java.time.LocalDate/of 2030 1 1`. The function calls Java, so it needs `::: JVM`.
```
:::
