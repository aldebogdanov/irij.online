The built-in effects are a start, but the real power is that you can declare **your own**. An effect is an interface of operations — *what* your code needs, with no word about *how*. A **handler** supplies the how, and you choose the handler where you call the code, not where you write it.

## Declaring an effect

```irij static
effect Ask
  ask :: Str -> Str
```

`Ask` has one operation, `ask`, which takes a question and gives back an answer. Code that performs `ask` must declare `Ask` in its row, exactly like `Console`:

```irij static
fn greet-user ::: Ask
  =>
  name := ask "What is your name?"
  "Hello, " ++ name ++ "!"
```

`greet-user` has no idea where the answer comes from — a terminal, a web form, a test script. Run it with nothing to answer `ask`, and it fails:

```irij fails
effect Ask
  ask :: Str -> Str

fn greet-user ::: Ask
  =>
  name := ask "What is your name?"
  "Hello, " ++ name ++ "!"

greet-user ()
```

## Handlers, with and resume

A handler gives each operation a clause. When the code performs `ask`, it pauses; the clause runs; and `resume value` hands `value` back to the paused code, which carries on as if `ask` had returned it. `with handler` installs a handler around a block:

```irij
effect Ask
  ask :: Str -> Str

fn greet-user ::: Ask
  =>
  name := ask "What is your name?"
  "Hello, " ++ name ++ "!"

handler always-ada :: Ask
  ask question => resume "Ada"

with always-ada
  println (greet-user ())
```

A `with` block is an expression — its value is the value of its last line. For a single expression, the inline form `with handler do expr` saves a level of indentation:

```irij
effect Ask
  ask :: Str -> Str

fn greet-user ::: Ask
  =>
  name := ask "What is your name?"
  "Hello, " ++ name ++ "!"

handler always-ada :: Ask
  ask _ => resume "Ada"

handler always-grace :: Ask
  ask _ => resume "Grace"

println (with always-ada do (greet-user ()))
println (with always-grace do (greet-user ()))
```

<!-- engine-limit: code-after-resume — the released engine silently skips code after `resume`; from aldebogdanov/irij#64 it's a compile error ("code after `resume` never runs"). Then: say why resume is last (it doesn't come back to the clause) and add an `irij fails` block showing the error -->
Same function, two behaviours, chosen by the caller. Make `resume` the last thing a clause does.

## Clauses with effects of their own

A clause may itself perform effects — say, print — if the handler declares them in its own row:

```irij
effect Log
  log :: Str -> ()

fn checkout ::: Log
  => total
  log ("checking out " ++ to-str total)
  log "payment accepted"
  total

handler to-console :: Log ::: Console
  log msg =>
    println ("[log] " ++ msg)
    resume ()

handler silent :: Log
  log _ => resume ()

println (with to-console do (checkout 42))
println (with silent do (checkout 42))
```

`checkout` stays pure of `Console`: whether logging prints, or goes nowhere, is decided by the handler you pick.

## Several operations, and operations without arguments

An effect can declare many operations; a handler must give each one a clause. An operation that takes nothing is declared `op :: () -> T`, its clause is `op () => …`, and it is performed as `op ()`:

```irij
effect Clock
  now :: () -> Int
  zone :: () -> Str

fn timestamp ::: Clock
  =>
  to-str (now ()) ++ " " ++ zone ()

handler frozen :: Clock
  now () => resume 1700000000
  zone () => resume "UTC"

with frozen do (timestamp ())
```

That's the whole trick behind testing effectful code in Irij: production gets a handler that talks to the real world, tests get one that answers from a script. The next lesson builds on it.

:::exercise config-handler Answer from a config
`banner` reads two settings through the `Config` effect. Write a handler `test-config` that answers `"Irij"` for `"name"`, `"0.9"` for `"version"`, and `"?"` for anything else — so that `with test-config do (banner ())` is `"Irij v0.9"`.

```irij starter
effect Config
  setting :: Str -> Str

fn banner ::: Config
  =>
  setting "name" ++ " v" ++ setting "version"

;; your handler here
```

```irij solution
effect Config
  setting :: Str -> Str

fn banner ::: Config
  =>
  setting "name" ++ " v" ++ setting "version"

fn lookup
  "name" => "Irij"
  "version" => "0.9"
  _ => "?"

handler test-config :: Config
  setting key => resume (lookup key)
```

```irij check
course-check "the banner" (-> with test-config do (banner ())) "Irij v0.9"
course-check "an unknown key" (-> with test-config do (setting "colour")) "?"
```

```hint
One clause, `setting key => …`, that resumes with a value chosen by `key`. A small helper `fn` with match arms (`"name" => "Irij"` …) keeps the clause short: `setting key => resume (lookup key)`.
```
:::

:::exercise loaded-dice Loaded dice
`two-dice` rolls a die twice through the `Dice` effect. Write a handler `loaded` whose `roll` always gives the highest face — `roll 6` is 6 — so that `with loaded do (two-dice 6)` is 12.

```irij starter
effect Dice
  roll :: Int -> Int

fn two-dice ::: Dice
  => sides
  roll sides + roll sides
```

```irij solution
effect Dice
  roll :: Int -> Int

fn two-dice ::: Dice
  => sides
  roll sides + roll sides

handler loaded :: Dice
  roll sides => resume sides
```

```irij check
course-check "two six-sided dice" (-> with loaded do (two-dice 6)) 12
course-check "two twenty-sided dice" (-> with loaded do (two-dice 20)) 40
```

```hint
The clause receives the operation's argument: `roll sides => resume sides`.
```
:::

:::exercise prefixed-log Prefixed logging
Write a handler `prefixed` for the `Log` effect that prints each message with `[app] ` in front, then run `work` under it. The program's output must be exactly:

```text
[app] starting
[app] done
```

```irij starter
effect Log
  log :: Str -> ()

fn work ::: Log
  =>
  log "starting"
  log "done"

work ()
```

```irij solution
effect Log
  log :: Str -> ()

fn work ::: Log
  =>
  log "starting"
  log "done"

handler prefixed :: Log ::: Console
  log msg =>
    println ("[app] " ++ msg)
    resume ()

with prefixed
  work ()
```

```text expect
[app] starting
[app] done
```

```hint
The handler prints, so it needs `::: Console` after `:: Log`. Its clause prints, then `resume ()`. Finally replace `work ()` with a `with prefixed` block around it.
```
:::
