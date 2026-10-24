The last lesson showed handlers answering operations. This one covers what makes them practical: handlers that remember, handlers that stop the work, handling several effects at once, failures — and the payoff, testing code that "does IO" without doing any.

## Handlers with state

A handler can keep **state**: declare it with `:!` above the clauses and update it with `<-`. After the `with` block, read it from outside as `handler.field`:

```irij
effect Log
  log :: Str -> ()

fn checkout ::: Log
  => total
  log "cart validated"
  log ("charged " ++ to-str total)
  total * 2

handler recorder :: Log
  lines :! #[]
  log msg =>
    lines <- conj lines msg
    resume ()

result := with recorder do (checkout 21)
println result
println recorder.lines
```

One cell per handler declaration, for the whole program: entering `with` again does **not** reset it. Successive blocks accumulate:

```irij
effect Log
  log :: Str -> ()

handler recorder :: Log
  lines :! #[]
  log msg =>
    lines <- conj lines msg
    resume ()

with recorder do (log "first run")
with recorder do (log "second run")
recorder.lines
```

When a test needs a clean slate, note the length before and look only at what was added after.

## Testing effectful code

Put the two ideas together and you can test code that sends email, charges cards or writes files — without sending, charging or writing anything. The business logic declares an effect; the test runs it under a recording handler and inspects what was recorded:

```irij
effect Mailer
  send :: Str -> Str -> ()

fn remind-overdue ::: Mailer
  => invoices
  overdue := invoices |> /? (i -> i.days-late > 30)
  overdue |> @ (i -> send i.email ("Invoice ${i.id} is overdue"))
  length overdue

handler outbox :: Mailer
  sent :! #[]
  send to body =>
    sent <- conj sent to
    resume ()

invoices := #[{id= 1 email= "ada@example.org" days-late= 45} {id= 2 email= "bob@example.org" days-late= 3} {id= 3 email= "eve@example.org" days-late= 90}]
count := with outbox do (remind-overdue invoices)
println count
println outbox.sent
```

In production you'd write a `smtp` handler for `Mailer` with `::: JVM` or a network effect in its row, and `remind-overdue` wouldn't change by a single character.

The built-in effects work the same way, as the last lesson's frozen clock showed — `random-int` too, which performs `Random`'s `rand-int`. So code that prints, sleeps and reads the clock is testable as it stands:

```irij
use std.time {Time}

fn report ::: Console Time
  =>
  start := now-ms ()
  sleep 60000
  println "took ${now-ms () - start} ms"

handler screen :: Console
  lines :! #[]
  println msg =>
    lines <- lines ++ #[msg]
    resume ()

handler fast-clock :: Time
  clock :! 0
  time-now => resume clock
  time-sleep ms =>
    clock <- clock + ms
    resume ()

with screen
  with fast-clock
    report ()
println screen.lines
```

The minute-long `sleep` returns at once and moves the fake clock forward, and the line `report` prints lands in `screen.lines` rather than on the screen. A handler only needs clauses for the operations it changes: `screen` has no `read-line` clause, so `read-line` still reads real input under it.

## Handling several effects: >>

`h1 >> h2` composes two handlers into one, so a single `with` covers both effects:

```irij
effect Log
  log :: Str -> ()

effect Ask
  ask :: Str -> Str

fn signup ::: Log Ask
  =>
  name := ask "name?"
  log ("signed up " ++ name)
  "welcome, " ++ name

handler quiet :: Log
  log _ => resume ()

handler scripted :: Ask
  ask _ => resume "Ada"

with quiet >> scripted do (println (signup ()))
```

Nesting `with` blocks works too; `>>` just keeps it flat.

## Stopping early: a clause without resume

A clause doesn't have to resume. If it returns a value instead, the rest of the `with` block is **abandoned** and that value becomes the block's result — like an exception that carries data, but defined by the handler:

```irij
effect Validate
  reject :: Str -> ()

handler first-problem :: Validate
  reject reason => Err reason

fn check-age
  => n
  with first-problem
    if (n < 0)
      reject "negative"
    if (n > 150)
      reject "implausibly old"
    Ok n

println (check-age 30)
println (check-age (-1))
println (check-age 200)
```

It doesn't matter how deep the operation is performed. Here `reject` happens two calls down from the `with`, and the whole rest of the work is still abandoned:

```irij
effect Validate
  reject :: Str -> ()

handler first-problem :: Validate
  reject reason => Err reason

fn check-name ::: Validate
  => name
  if (name == "")
    reject "empty name"
  name

fn check-user ::: Validate
  => user
  check-name user.name
  if (user.age < 0)
    reject "negative age"
  user

println (with first-problem do (Ok (check-user {name= "Ada" age= 36})))
println (with first-problem do (Ok (check-user {name= "" age= -1})))
```

## on-failure

A `with` block can end with an `on-failure` block at the same indentation. It runs if anything inside raises, and the name `error` holds what was raised:

```irij
effect Store
  load :: Str -> Str

handler flaky :: Store
  load key =>
    if (key == "missing")
      error ("no such key: " ++ key)
    else
      resume ("value of " ++ key)

fn load-or-explain
  => key
  with flaky
    load key
  on-failure
    "failed: " ++ error

println (load-or-explain "colour")
println (load-or-explain "missing")
```

## Handlers as values

A handler is a value: pass one to a function, return one from a function, compose them at run time. The spec `(Handler Log)` accepts any handler for `Log`:

```irij
effect Log
  log :: Str -> ()

handler loud :: Log ::: Console
  log msg =>
    println ("LOG " ++ msg)
    resume ()

handler quiet :: Log
  log _ => resume ()

fn pick-logger :: Bool (Handler Log)
  (verbose? -> if verbose? loud else quiet)

fn job ::: Log
  =>
  log "working"
  42

with pick-logger true do (job ())
```

:::exercise outbox Test the reminders
`remind` sends one email per address through the `Mailer` effect and returns how many it sent. Write a handler `outbox` that **records** each recipient in a state field called `sent` (a vector, in order) instead of sending anything, then resumes.

```irij starter
effect Mailer
  send :: Str -> Str -> ()

fn remind ::: Mailer
  => emails
  emails |> @ (e -> send e "Your invoice is overdue")
  length emails

handler outbox :: Mailer
  send to body => resume ()
```

```irij solution
effect Mailer
  send :: Str -> Str -> ()

fn remind ::: Mailer
  => emails
  emails |> @ (e -> send e "Your invoice is overdue")
  length emails

handler outbox :: Mailer
  sent :! #[]
  send to body =>
    sent <- conj sent to
    resume ()
```

```irij check
course-before := length outbox.sent
course-count := with outbox do (remind #["ada@example.org" "bob@example.org"])
course-check "remind returns the count" (-> course-count) 2
course-check "both recipients recorded, in order" (-> drop course-before outbox.sent) #["ada@example.org" "bob@example.org"]
```

```hint
Declare `sent :! #[]` on the line after `handler outbox :: Mailer`, and in the clause append with `sent <- conj sent to` before `resume ()`.
```
:::

:::exercise fallback Fall back on failure
The `flaky` handler raises for the key `"missing"`. Write `load-or-default`, which runs `load key` under `flaky` and returns `"default"` if anything fails.

```irij starter
effect Store
  load :: Str -> Str

handler flaky :: Store
  load key =>
    if (key == "missing")
      error "no such key"
    else
      resume ("value of " ++ key)

fn load-or-default
  => key
  with flaky
    load key
```

```irij solution
effect Store
  load :: Str -> Str

handler flaky :: Store
  load key =>
    if (key == "missing")
      error "no such key"
    else
      resume ("value of " ++ key)

fn load-or-default
  => key
  with flaky
    load key
  on-failure
    "default"
```

```irij check
course-check "a key that exists" (-> load-or-default "colour") "value of colour"
course-check "a missing key" (-> load-or-default "missing") "default"
```

```hint
Add `on-failure` at the same indentation as `with`, with `"default"` indented under it.
```
:::

:::exercise first-error Stop at the first problem
Write a handler `to-err` for `Validate` whose `reject reason` clause **doesn't resume**, but returns `Err reason` — so `check-password` stops at the first rule that fails.

```irij starter
effect Validate
  reject :: Str -> ()

handler to-err :: Validate
  reject reason => resume ()

fn check-password
  => pw
  with to-err
    if (length pw < 8)
      reject "too short"
    if (! (contains? (split pw "") "!"))
      reject "needs a !"
    Ok pw
```

```irij solution
effect Validate
  reject :: Str -> ()

handler to-err :: Validate
  reject reason => Err reason

fn check-password
  => pw
  with to-err
    if (length pw < 8)
      reject "too short"
    if (! (contains? (split pw "") "!"))
      reject "needs a !"
    Ok pw
```

```irij check
course-check "a good password" (-> check-password "irij-rocks!") (Ok "irij-rocks!")
course-check "too short" (-> check-password "ab!") (Err "too short")
course-check "no bang" (-> check-password "longenough") (Err "needs a !")
```

```hint
A clause that returns a value without calling `resume` ends the `with` block with that value: `reject reason => Err reason`.
```
:::
