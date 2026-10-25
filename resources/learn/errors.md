Things go wrong: input doesn't parse, a file is missing, a caller passes nonsense. Irij gives you three tools, from loudest to most precise.

## error and try

`error value` stops the current computation and raises `value`. `try thunk` runs a zero-argument function and turns the outcome into data: `Ok result` if it finished, `Err value` if something was raised.

```irij
fn check-age
  => n
  if (n < 0)
    error "age can't be negative"
  else
    n

println (try (-> check-age 30))
println (try (-> check-age (-5)))
```

The runtime's own failures arrive the same way, as a message:

```irij
println (try (-> 10 / 0))
println (try (-> nth 5 #[1 2 3]))
println (try (-> parse-int "forty-two"))
```

You may raise **any** value, not just a string. Raise a map and the caller can match on its fields instead of picking a message apart:

```irij
fn find-user
  => id
  if (id == 1)
    {id= 1 name= "Ada"}
  else
    error {code= :not-found id= id}

fn show-user
  => id
  match (try (-> find-user id))
    Ok user => "found " ++ user.name
    Err {code= :not-found id= missing} => "no user " ++ to-str missing
    Err other => "unexpected: " ++ to-str other

println (show-user 1)
println (show-user 42)
```

## Ok and Err as return values

Raising is for the unexpected. When failure is a normal outcome — invalid input, say — return `Ok` or `Err` yourself and let the caller `match`. Nothing is raised, and the possibility of failure is visible in the result — and in the signature, through the builtin spec `Result`: `(Result Int Str)` reads "an `Ok` holding an `Int`, or an `Err` holding a `Str`".

```irij
fn parse-port :: Str (Result Int Str)
  => text
  match (try (-> parse-int text))
    Err _ => Err "not a number"
    Ok n | n < 1 || n > 65535 => Err "out of range"
    Ok n => Ok n

println (parse-port "8080")
println (parse-port "eighty")
println (parse-port "99999")
```

## Contracts: pre and post

A **contract** is a check attached to a function. `pre` receives the arguments and must be true before the body runs; `post` receives the result and must be true after. Put them between the `fn` line and the body:

```irij
fn withdraw
  pre (balance amount -> amount > 0)
  pre (balance amount -> amount <= balance)
  post (result -> result >= 0)
  (balance amount -> balance - amount)

println (withdraw 100 30)
println (try (-> withdraw 100 500))
```

Contracts carry **blame**. A failed `pre` is the caller's fault — they passed bad arguments. A failed `post` is the function's own fault — it broke its promise:

```irij
fn discount
  post (price -> price >= 0)
  (price -> price - 20)

println (try (-> discount 50))
println (try (-> discount 10))
```

`in` and `out` work like `pre` and `post` but are meant for a module's public functions, where the caller and the implementation are written by different people (or different models) and the blame message says so:

```irij
fn api-square
  in (n -> n < 1000)
  out (r -> r < 1000000)
  (n -> n * n)

println (api-square 12)
println (try (-> api-square 5000))
```

Specs check *shape* ("an Int"); contracts check *meaning* ("a positive Int no bigger than the balance"). Use both where a mistake would be costly.

:::exercise safe-div Safe division
Write `safe-div`, which returns `Err "division by zero"` when the divisor is 0, and `Ok` the quotient otherwise. It must never raise.

```irij starter
fn safe-div
  (a b -> a / b)
```

```irij solution
fn safe-div
  (a b -> if (b == 0) (Err "division by zero") else (Ok (a / b)))
```

```irij check
course-check "10 / 2" (-> safe-div 10 2) (Ok 5)
course-check "7 / 0" (-> safe-div 7 0) (Err "division by zero")
course-check "exact fractions too" (-> safe-div 1 3/4) (Ok 4/3)
```

```hint
An inline `if` with each branch in parentheses: `if (b == 0) (Err "…") else (Ok (a / b))`.
```
:::

:::exercise parse-percent Parse a percentage
Write `parse-percent`, which turns text into `Ok` an Int from 0 to 100. Text that isn't a number gives `Err "not a number"`; a number outside 0–100 gives `Err "out of range"`.

`parse-int` raises on bad text, so wrap it in `try`.

```irij starter
fn parse-percent
  (text -> Ok (parse-int text))
```

```irij solution
fn parse-percent
  => text
  match (try (-> parse-int text))
    Err _ => Err "not a number"
    Ok n | n < 0 || n > 100 => Err "out of range"
    Ok n => Ok n
```

```irij check
course-check "\"42\"" (-> parse-percent "42") (Ok 42)
course-check "\"100\"" (-> parse-percent "100") (Ok 100)
course-check "\"abc\"" (-> parse-percent "abc") (Err "not a number")
course-check "\"101\"" (-> parse-percent "101") (Err "out of range")
course-check "\"-1\"" (-> parse-percent "-1") (Err "out of range")
```

```hint
`match (try (-> parse-int text))` with three arms: `Err _`, `Ok n` with a guard for the range, and plain `Ok n`.
```
:::

:::exercise transfer-contract Guard the transfer
`transfer balance amount` returns the balance after sending `amount`. Add **pre-conditions** so that a call with an amount that isn't positive, or that exceeds the balance, is rejected as the caller's fault.

```irij starter
fn transfer
  (balance amount -> balance - amount)
```

```irij solution
fn transfer
  pre (balance amount -> amount > 0)
  pre (balance amount -> amount <= balance)
  (balance amount -> balance - amount)
```

```irij check
fn course-pre-failure?
  (Err msg) => starts-with? (to-str msg) "Pre-condition"
  _ => false

course-check "a valid transfer" (-> transfer 100 30) 70
course-check "the whole balance" (-> transfer 100 100) 0
course-check "zero is rejected" (-> course-pre-failure? (try (-> transfer 100 0))) true
course-check "overdraft is rejected" (-> course-pre-failure? (try (-> transfer 10 20))) true
```

```hint
Two lines between `fn transfer` and the body: `pre (balance amount -> amount > 0)` and one more for the balance.
```
:::
