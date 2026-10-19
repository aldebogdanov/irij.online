Most loops in other languages are "for each element, do something, keep some of them, combine the results". Irij writes that as a **pipeline**: data enters on the left and flows through steps joined by `|>`.

```irij
#[1 2 3 4 5 6 7 8 9 10]
  |> /? (n -> n % 2 == 0)
  |> @ (n -> n * n)
  |> /+
```

Read it top to bottom: take the numbers, keep the even ones, square each, add them up. A line that starts with an operator like `|>` and is indented deeper continues the line above it.

## The sequence digraphs

Irij's everyday collection operations are one- or two-character operators, inspired by APL and J:

| Digraph | Means | Example | Result |
|---|---|---|---|
| `@ f` | map: apply `f` to each | `#[1 2 3] \|> @ (n -> n * 10)` | `#[10 20 30]` |
| `/? p` | filter: keep where `p` is true | `#[1 2 3 4] \|> /? (n -> n > 2)` | `#[3 4]` |
| `/+` | sum | `#[1 2 3] \|> /+` | `6` |
| `/*` | product | `#[1 2 3 4] \|> /*` | `24` |
| `/#` | count | `#[5 6 7] \|> /#` | `3` |
| `/&` | all true? | `#[true false] \|> /&` | `false` |
| `/\|` | any true? | `#[true false] \|> /\|` | `true` |
| `/! p` | first element where `p` holds | `#[1 5 9] \|> /! (n -> n > 3)` | `5` |
| `/^ f` | reduce with `f` | `#[3 9 2] \|> /^ (a b -> max a b)` | `9` |
| `/$ f` | scan: every running result | `#[1 2 3] \|> /$ (+)` | `#[1 3 6]` |
| `@i f` | map with the index | `#["a" "b"] \|> @i (i s -> to-str i ++ s)` | `#["0a" "1b"]` |

Try a few:

```irij
scores := #[72 95 88 61 99 85]
println (scores |> /? (s -> s >= 85))
println (scores |> @ (s -> s - 60))
println (scores |> /#)
println (scores |> /^ (a b -> max a b))
println (scores |> /! (s -> s > 90))
println (scores |> @ (s -> s >= 60) |> /&)
```

`/!` returns `()` when nothing matches. The reducing digraphs `/+`, `/*` and `/^` need at least one element — for a result that may be empty, use `fold`, below.

The digraphs work on ranges as well as vectors:

```irij
1..10 |> @ (n -> n * n) |> /+
```

## fold

`fold f init xs` is the general reducer: it starts from `init` and combines each element into it. The function takes the **accumulator first**, then the element:

```irij
println (fold (acc n -> acc + n) 0 #[1 2 3 4])
println (fold (acc n -> acc + n) 0 #[])
println (fold (acc w -> acc ++ w ++ "!") "" #["go" "team"])
```

Swap the order of `acc` and `n` and you get nonsense, not an error — it's the one thing worth memorising about `fold`.

## Mixing in other functions

Any function that takes the collection as its **last** argument fits after `|>`: `xs |> take 3` is `take 3 xs`. So `sort`, `reverse`, `take`, `drop`, `length` all slot in:

```irij
words := split "the quick brown fox jumps over the lazy dog" " "
top3 := words
  |> /? (w -> length w > 3)
  |> sort
  |> take 3
println top3
println (words |> @ (w -> length w) |> /+)
```

:::exercise odd-squares Sum of odd squares
Write `sum-odd-squares`: keep the odd numbers of a vector, square them, and add them up. An empty vector (or one with no odd numbers) gives 0.

```irij starter
fn sum-odd-squares
  (xs -> 0)

println (sum-odd-squares #[1 2 3 4 5])
```

```irij solution
fn sum-odd-squares
  (xs -> xs |> /? (n -> n % 2 /= 0) |> @ (n -> n * n) |> fold (acc n -> acc + n) 0)

println (sum-odd-squares #[1 2 3 4 5])
```

```irij check
course-check "1 to 5" (-> sum-odd-squares #[1 2 3 4 5]) 35
course-check "no odd numbers" (-> sum-odd-squares #[2 4 6]) 0
course-check "empty" (-> sum-odd-squares #[]) 0
course-check "negative odd" (-> sum-odd-squares #[(-3) 3]) 18
```

```hint
`/?` then `@`, then finish with `fold (acc n -> acc + n) 0` instead of `/+` so the empty case works. A negative odd number has `n % 2 == -1`, so test `n % 2 /= 0`.
```
:::

:::exercise longest-word Longest word
Write `longest-word`, which returns the longest word in a sentence (words are separated by single spaces). On a tie, keep the first.

```irij starter
fn longest-word
  (sentence -> sentence)
```

```irij solution
fn longest-word
  (sentence -> split sentence " " |> /^ (best w -> if (length w > length best) w else best))
```

```irij check
course-check "the quick brown fox" (-> longest-word "the quick brown fox") "quick"
course-check "a tie keeps the first" (-> longest-word "ab cd ef") "ab"
course-check "one word" (-> longest-word "Irij") "Irij"
```

```hint
`split sentence " "` gives the words. Reduce them with `/^`, keeping whichever of the two is longer — and `best` when they are equal.
```
:::

:::exercise balance Running balance
A bank account starts at 0. Given a vector of transactions (deposits are positive, withdrawals negative), write `balances`, which returns the balance after each one. `balances #[100 (-20) 50]` is `#[100 80 130]`.

```irij starter
fn balances
  (txs -> txs)
```

```irij solution
fn balances
  (txs -> txs |> /$ (+))
```

```irij check
course-check "three transactions" (-> balances #[100 (-20) 50]) #[100 80 130]
course-check "one deposit" (-> balances #[7]) #[7]
course-check "back to zero" (-> balances #[10 (-10) 5 (-5)]) #[10 0 5 0]
```

```hint
That's exactly what a scan does: `/$` with addition.
```
:::
