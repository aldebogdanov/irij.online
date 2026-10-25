Here is Irij's central idea. A function **without** an annotation is **pure**: it computes a value from its arguments and does nothing else — no printing, no clock, no randomness, no network. A function that does any of those things must say so in its **effect row**, written after `:::`.

```irij
fn greet ::: Console
  => name
  println ("Hello, " ++ name ++ "!")

greet "Ada"
```

Leave the row off and the program doesn't compile. This is checked before anything runs:

```irij fails
fn greet
  => name
  println ("Hello, " ++ name ++ "!")

greet "Ada"
```

(Top-level code — the lines outside any `fn` — may use every effect, which is why `println` has worked everywhere so far.)

## The built-in effects

| Effect | Performed by |
|---|---|
| `Console` | `print`, `println`, `read-line` |
| `Time` | `now-ms`, `sleep` |
| `Random` | `random-int`, `random-float` |
| `Env` | `env` (environment variables) |
| `JVM` | any call into Java (lesson 15) |

A row can list several, and it combines with a spec annotation — specs after `::`, effects after `:::`:

```irij
fn timed :: Str Int ::: Console Time
  => label
  start := now-ms ()
  println ("running " ++ label)
  now-ms () - start

println (timed "a quick job" >= 0)
```

`timed` reads the real clock, so its result changes from run to run — all this program can promise is `>= 0`. The next lesson shows how to hand it a clock that always gives the same answer.

## Effects travel up the call chain

If `f` calls `g`, then `f` does everything `g` does. So a caller must declare every effect of the functions it calls:

```irij fails
fn log ::: Console
  (msg -> println ("[log] " ++ msg))

fn process
  => x
  log "processing"
  x * 2

process 21
```

The error names the call that needs `Console` and where. The fix is to add `::: Console` to `process` — or to handle the effect, which is what the next lesson is about.

This is what makes a signature trustworthy. `fn price-with-tax :: Int Int` *cannot* print, read the clock or touch the network, no matter how deep its helpers go — not even by installing a handler that does (the next lesson shows why). You can test it with plain values, call it from anywhere, and run it in parallel without a second thought.

## Higher-order functions and row variables

What about a function that takes a callback, like `twice`? It's pure itself, but the callback might print. A **row variable** says "whatever effects the callback has, I have too":

```irij
fn twice :: (Fn):eff _ _ ::: eff
  (f x -> f (f x))

fn shout ::: Console
  => s
  println (upper-case s)
  s

fn run ::: Console
  =>
  twice shout "hey"

run ()
twice (n -> n * 10) 7
```

`(Fn):eff` binds the callback's effect row to the name `eff`, and `::: eff` passes it on. Called with a pure lambda, `twice` is pure; called with `shout`, it needs `Console` — and a caller that forgets is caught at compile time:

```irij fails
fn twice :: (Fn):eff _ _ ::: eff
  (f x -> f (f x))

fn shout ::: Console
  => s
  println s
  s

fn quiet
  =>
  twice shout "hey"

quiet ()
```

The standard library's `map`, `filter` and `fold` are written exactly this way.

:::exercise fix-rows Fix the rows
This program doesn't compile: two functions perform effects they don't declare. Add the missing effect rows — nothing else needs to change.

```irij starter
fn announce
  => msg
  println ("> " ++ msg)
  msg

fn timed-announce
  => msg
  start := now-ms ()
  announce msg
  now-ms () - start >= 0

timed-announce "effects are declared"
```

```irij solution
fn announce ::: Console
  => msg
  println ("> " ++ msg)
  msg

fn timed-announce ::: Console Time
  => msg
  start := now-ms ()
  announce msg
  now-ms () - start >= 0

timed-announce "effects are declared"
```

```irij check
course-check "announce returns its message" (-> announce "hi") "hi"
course-check "timed-announce runs" (-> timed-announce "hi") true
```

```hint
`announce` prints, so it needs `::: Console`. `timed-announce` reads the clock *and* calls `announce` — so it needs both effects: `::: Console Time`.
```
:::

:::exercise pure-core A pure core
Keep the logic pure and the printing at the edge. Write a **pure** function `receipt-lines` that turns a vector of `{name= … price= …}` items into lines like `"tea: 3"`, followed by a last line `"total: 8"`. Then write `print-receipt ::: Console`, which prints those lines.

The checks call `receipt-lines` from inside a pure function, so it must not print.

```irij starter
fn receipt-lines
  => items
  #[]

fn print-receipt ::: Console
  => items
  println "todo"

print-receipt #[{name= "tea" price= 3} {name= "cake" price= 5}]
```

```irij solution
fn receipt-lines
  => items
  lines := items |> @ (i -> i.name ++ ": " ++ to-str i.price)
  total := items |> fold (acc i -> acc + i.price) 0
  lines ++ #[("total: " ++ to-str total)]

fn print-receipt ::: Console
  => items
  receipt-lines items |> @ (l -> println l)

print-receipt #[{name= "tea" price= 3} {name= "cake" price= 5}]
```

```irij check
fn course-pure-receipt
  (items -> receipt-lines items)

course-check "tea and cake" (-> course-pure-receipt #[{name= "tea" price= 3} {name= "cake" price= 5}]) #["tea: 3" "cake: 5" "total: 8"]
course-check "an empty order" (-> course-pure-receipt #[]) #["total: 0"]
```

```hint
In `receipt-lines`: map each item to its line with `@`, sum the prices with `fold`, and append the total with `++ #[(...)]` (a call inside `#[ ]` needs parentheses). `print-receipt` maps `println` over those lines.
```
:::
