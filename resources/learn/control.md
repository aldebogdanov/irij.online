<!-- engine-limit: no-cond-case — irij feat/case-cond adds `cond` and `case` (spec §2.3a): teach them in this lesson, after `match` -->
Irij has no `for` or `while`. To choose, you use `if` and `match`; to repeat, a function calls itself — or, very often, a pipeline does the looping for you (lesson 6).

## if … else

The inline form fits on one line. It needs both branches, and each branch is a single term — a name, a literal, or something in parentheses:

```irij
n := 7
parity := if (n % 2 == 0) "even" else "odd"
println parity
println (if (n > 5) "big" else "small")
```

Because each part is one term, Irij refuses an inline `if` that *looks* like it means one thing but would parse as another. This is a compile error, and the message says how to fix it:

```irij fails
n := 4
println (if (n > 3) 1 else n + 1)
```

Write `else (n + 1)` to put the sum in the branch, or `(if … else n) + 1` to add to whichever branch is taken.

The **block form** puts branches on their own indented lines. It can hold several statements, chains with `else if`, and is an expression too — bind its result with `:=`:

```irij
temperature := 18
advice := if (temperature > 25)
  "shorts"
else if (temperature > 15)
  "a light jacket"
else
  "a coat"
println "Wear ${advice}."
```

Without an `else`, a block `if` simply does nothing when the condition is false.

## match

`match` compares a value against a list of patterns, top to bottom, and evaluates the first arm that fits. Like `if`, it is an expression.

```irij
fn http-text
  => code
  match code
    200 => "OK"
    404 => "Not Found"
    500 => "Internal Server Error"
    _ => "Unknown"

println (http-text 404)
println (http-text 418)
```

`_` matches anything and binds nothing. A plain name matches anything and binds it. Keywords, strings and numbers match themselves:

```irij
result := :timeout
message := match result
  :ok => "all good"
  :timeout => "try again later"
  other => "unexpected: " ++ to-str other
println message
```

### Guards

Add `| condition` after a pattern to accept it only when the condition holds. Guards turn a `match` into a neat decision table:

```irij
fn classify
  n | n < 0 => "negative"
  0 => "zero"
  n | n < 10 => "small"
  _ => "large"

println (classify (-3))
println (classify 0)
println (classify 7)
println (classify 1000)
```

The same arms work directly as a function body (lesson 3's second form), as `classify` shows — a function whose body is arms is a `match` on its argument.

## Recursion

To repeat something, call the function again with a smaller problem, and stop at a base case:

```irij
fn factorial
  0 => 1
  n => n * factorial (n - 1)

println (factorial 5)
println (factorial 30)
```

<!-- engine-limit: match-arm-tco — fixed by irij fix/match-arm-tco: say match-arm bodies are tail calls too -->
When the recursive call is the **last thing** a lambda or imperative body does, Irij reuses the stack frame, so it can run a million times without overflowing. Carry the running result in an extra parameter (an *accumulator*) to get there:

```irij
fn sum-to
  (total n -> if (n == 0) total else (sum-to (total + n) (n - 1)))

sum-to 0 1000000
```

:::exercise fizzbuzz FizzBuzz
Write `fizzbuzz`, which returns `"FizzBuzz"` for multiples of both 3 and 5, `"Fizz"` for other multiples of 3, `"Buzz"` for other multiples of 5, and the number as a string otherwise.

```irij starter
fn fizzbuzz
  n => to-str n

println (fizzbuzz 15)
```

```irij solution
fn fizzbuzz
  n | n % 15 == 0 => "FizzBuzz"
  n | n % 3 == 0 => "Fizz"
  n | n % 5 == 0 => "Buzz"
  n => to-str n

println (fizzbuzz 15)
```

```irij check
course-check "15" (-> fizzbuzz 15) "FizzBuzz"
course-check "9" (-> fizzbuzz 9) "Fizz"
course-check "10" (-> fizzbuzz 10) "Buzz"
course-check "7" (-> fizzbuzz 7) "7"
course-check "30" (-> fizzbuzz 30) "FizzBuzz"
```

```hint
Order the arms from most specific to least: check 15 before 3 and 5. A guard looks like `n | n % 3 == 0 => "Fizz"`.
```
:::

:::exercise collatz Collatz steps
Starting from a positive number: if it is even, halve it; if it is odd, triple it and add one. Repeat until you reach 1. Write `collatz-steps n`, the number of steps that takes. (`collatz-steps 1` is 0; `collatz-steps 6` is 8.)

```irij starter
fn collatz-steps
  n => 0
```

```irij solution
fn collatz-steps
  1 => 0
  n | n % 2 == 0 => 1 + collatz-steps (n / 2)
  n => 1 + collatz-steps (3 * n + 1)
```

```irij check
course-check "from 1" (-> collatz-steps 1) 0
course-check "from 6" (-> collatz-steps 6) 8
course-check "from 27" (-> collatz-steps 27) 111
```

```hint
Three arms: `1 => 0`, then an even case with a guard, then the odd case. Each recursive case adds 1 to the steps that remain. Halving an even number with `n / 2` is exact.
```
:::

:::exercise grade Letter grades
Write `grade`, which turns a score from 0 to 100 into a letter: 90 and up is `"A"`, 80 and up `"B"`, 70 and up `"C"`, anything lower `"F"`.

```irij starter
fn grade
  score => "F"
```

```irij solution
fn grade
  s | s >= 90 => "A"
  s | s >= 80 => "B"
  s | s >= 70 => "C"
  _ => "F"
```

```irij check
course-check "95" (-> grade 95) "A"
course-check "90" (-> grade 90) "A"
course-check "85" (-> grade 85) "B"
course-check "70" (-> grade 70) "C"
course-check "42" (-> grade 42) "F"
```
:::
