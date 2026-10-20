Irij runs concurrent work on the JVM's **virtual threads**: they are cheap enough to start thousands, and blocking one (on `sleep`, a network call, a file) costs nothing but the wait. The rule that keeps it manageable is **structured concurrency** — concurrent work lives inside a scope, and the scope doesn't end until all of it has.

All the examples simulate slow work with `sleep` (milliseconds), which is why their functions carry `::: Time`.

## scope, fork and await

`scope s` opens a scope named `s`. Inside it, `s.fork thunk` starts the thunk on its own fiber and immediately gives back a handle; `await handle` waits for that fiber's result. When the block ends, the scope waits for every fiber it started.

```irij
fn fetch ::: Time
  => name ms
  sleep ms
  name ++ " (" ++ to-str ms ++ "ms)"

start := now-ms ()
scope s
  a := s.fork (-> fetch "users" 300)
  b := s.fork (-> fetch "orders" 300)
  println (await a)
  println (await b)
println "both done after about ${now-ms () - start}ms, not 600"
```

<!-- engine-limit: scope-value — a `scope` block evaluates to () and `await` isn't a value (open irij task); once fixed, return the value from the scope directly -->
To carry results out of a scope, update a mutable binding from inside it:

```irij
fn fetch ::: Time
  => name ms
  sleep ms
  name

fn dashboard ::: Time
  =>
  user :! ""
  orders :! ""
  scope s
    u := s.fork (-> fetch "ada" 200)
    o := s.fork (-> fetch "3 orders" 200)
    user <- await u
    orders <- await o
  user ++ " has " ++ orders

dashboard ()
```

If a fiber raises, the scope cancels the others and re-raises. `scope.supervised s` lets fibers fail independently instead, and `scope.race s` keeps the first fiber to finish and cancels the rest.

## par, race and timeout

For the common shapes there are one-line combinators.

`par f thunk-a thunk-b` runs both thunks at once and combines their results with `f`:

```irij
fn slow-square ::: Time
  => n
  sleep 300
  n * n

fn squares ::: Time
  =>
  par (+) (-> slow-square 3) (-> slow-square 4)

start := now-ms ()
println (squares ())
println "took about ${now-ms () - start}ms"
```

`race` runs thunks at once, returns the **first** result, and cancels the losers — for instance, asking two replicas and taking whichever answers first:

```irij
fn ask-server ::: Time
  => name ms
  sleep ms
  name

fn fastest ::: Time
  =>
  race (-> ask-server "primary" 400) (-> ask-server "replica" 50)

fastest ()
```

`timeout ms thunk` gives the thunk a deadline. If it finishes in time you get its result; if not, it is cancelled and `timeout` raises — so pair it with `try`:

```irij
fn ask-server ::: Time
  => name ms
  sleep ms
  name

println (try (-> timeout 1000 (-> ask-server "quick" 50)))
println (try (-> timeout 100 (-> ask-server "slow" 2000)))
```

Cancellation really stops the losing work: a cancelled fiber is interrupted at its next `sleep` or loop iteration rather than left running in the background.

:::exercise parallel-fetch Fetch in parallel
`lookup` takes 400 ms. Write `total-stock`, which looks up the stock of `"apples"` and `"pears"` **at the same time** and returns their sum. Done one after the other it takes 800 ms; the check wants it under 700.

```irij starter
fn lookup ::: Time
  => item
  sleep 400
  if (item == "apples") 12 else 30

fn total-stock ::: Time
  =>
  lookup "apples" + lookup "pears"
```

```irij solution
fn lookup ::: Time
  => item
  sleep 400
  if (item == "apples") 12 else 30

fn total-stock ::: Time
  =>
  par (+) (-> lookup "apples") (-> lookup "pears")
```

```irij check
course-start := now-ms ()
course-total := total-stock ()
course-took := now-ms () - course-start
course-check "the sum" (-> course-total) 42
course-check "in parallel (under 700 ms)" (-> course-took < 700) true
```

```hint
`par (+) (-> …) (-> …)` runs two thunks concurrently and adds their results.
```
:::

:::exercise deadline Meet the deadline
Write `within-100ms`, which runs a thunk with a 100 ms deadline: it returns the thunk's result if it finishes in time, and the string `"too slow"` if it doesn't.

```irij starter
fn within-100ms ::: Time
  => thunk
  thunk ()
```

```irij solution
fn within-100ms ::: Time
  => thunk
  match (try (-> timeout 100 thunk))
    Ok v => v
    Err _ => "too slow"
```

```irij check
course-check "a quick answer" (-> within-100ms (-> 42)) 42
course-check "a slow answer" (-> within-100ms (-> sleep 1000; "late")) "too slow"
```

```hint
`timeout 100 thunk` raises when the deadline passes; `try` turns that into `Err`, which you can `match`.
```
:::
