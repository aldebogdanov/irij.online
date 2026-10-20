A **pattern** describes the shape of a value and names the parts you care about. You've already used the simplest ones — literals like `0`, names like `n`, the wildcard `_`. This lesson covers the patterns that take collections apart, and the three places patterns appear:

- a binding: `#(x y) := point`
- the arms of a function body: `#[] => 0`
- the arms of a `match`

## Vector patterns

`#[]` matches only the empty vector. `#[a b]` matches a vector of exactly two elements. `...name` matches "the rest" — any number of elements, bound as a vector:

```irij
fn describe
  #[] => "nothing"
  #[x] => "just " ++ to-str x
  #[x y] => "a pair"
  #[x ...rest] => "starts with ${x}, then ${length rest} more"

println (describe #[])
println (describe #[7])
println (describe #[7 8])
println (describe #[7 8 9 10])
```

(`...` is three dots — the rest of a pattern. `..` with two dots is the range operator.)

The pair `#[]` / `#[x ...rest]` is the classic way to walk a vector recursively: handle the empty case, then handle one element and recurse on the rest.

```irij
fn total
  #[] => 0
  #[x ...rest] => x + total rest

total #[4 8 15 16 23 42]
```

Taking the rest is cheap — it shares the vector rather than copying it.

## Map patterns

`{field= pattern}` matches any map that has that field, and matches the field's value against the pattern. Fields you don't mention are ignored, so a map pattern is always a *partial* match:

```irij
fn greet
  {role= "admin" name= n} => "Welcome back, " ++ n
  {name= n} => "Hello, " ++ n

println (greet {name= "Ada" role= "admin"})
println (greet {name= "Grace" role= "guest" id= 7})
```

The first arm only matches when `role` is exactly `"admin"`; everything else with a `name` falls through to the second.

Map patterns are also how you pull fields out in a binding, and in an imperative function's parameter list:

```irij
{name= who age= years} := {name= "Grace" age= 85 rank= "admiral"}
println "${who} is ${years}"

fn label
  => {name= n}
  "<" ++ n ++ ">"

println (label {name= "Irij" kind= "language"})
```

## Tuple patterns

A tuple pattern lists one pattern per position:

```irij
fn swap
  #(a b) => #(b a)

fn origin?
  #(0 0) => true
  _ => false

println (swap #("left" "right"))
println (origin? #(0 0))
println (origin? #(0 3))
```

## Nesting and guards

Patterns nest, and an arm can still carry a guard:

```irij
fn first-adult
  #[] => "nobody"
  #[{name= n age= a} ...rest] | a >= 18 => n
  #[_ ...rest] => first-adult rest

people := #[{name= "Tim" age= 9} {name= "Ann" age= 34} {name= "Lee" age= 51}]
first-adult people
```

<!-- engine-limit: lambda-param-patterns — fixed by irij fix/pattern-gaps: lambdas take patterns, `(#(a b) -> a + b)`; also `#(:ok v)` tuple patterns now work -->
One limit to know: a lambda's parameters are plain names (or `_`). When you want to take an argument apart, write a `fn` with arms, or match inside the body.

:::exercise count-up Count without length
Write `count`, which returns how many elements a vector has — without using `length` or `/#`. Use the `#[]` and `#[x ...rest]` patterns.

```irij starter
fn count
  xs => 0
```

```irij solution
fn count
  #[] => 0
  #[_ ...rest] => 1 + count rest
```

```irij check
course-check "empty" (-> count #[]) 0
course-check "three" (-> count #["a" "b" "c"]) 3
course-check "nested vectors count once" (-> count #[#[1 2] #[3]]) 2
```

```hint
An empty vector has 0 elements; a non-empty one has 1 more than its rest.
```
:::

<!-- engine-limit: bool-patterns — the shipping exercise uses `speed= :express` because `true`/`false` patterns matched anything; fixed by irij fix/pattern-gaps, `{express= true}` can come back -->
:::exercise shipping Shipping label
Orders are maps. Write `shipping`, which returns:

- `"free"` for an order whose `country` is `"NO"` (whatever else it has),
- `"express"` when the order's `speed` is `:express`,
- `"standard"` otherwise.

The country rule wins over express.

```irij starter
fn shipping
  order => "standard"
```

```irij solution
fn shipping
  {country= "NO"} => "free"
  {speed= :express} => "express"
  _ => "standard"
```

```irij check
course-check "Norway is free" (-> shipping {country= "NO" speed= :express}) "free"
course-check "express elsewhere" (-> shipping {country= "SE" speed= :express}) "express"
course-check "plain order" (-> shipping {country= "SE" speed= :normal}) "standard"
course-check "no fields at all" (-> shipping {}) "standard"
```

```hint
Three arms with map patterns, most specific first. A field with a literal pattern — a string or a keyword — only matches that exact value.
```
:::

:::exercise pairs Zip two vectors
Write `zip`, which pairs up two vectors element by element into a vector of tuples, stopping at the shorter one: `zip #[1 2 3] #["a" "b"]` is `#[#(1 "a") #(2 "b")]`.

An imperative body can `match` on a tuple of both arguments, so you can pattern-match two vectors at once.

```irij starter
fn zip
  => xs ys
  #[]
```

```irij solution
fn zip
  => xs ys
  match #(xs ys)
    #(#[x ...xr] #[y ...yr]) => #[#(x y)] ++ zip xr yr
    _ => #[]
```

```irij check
course-check "shorter second" (-> zip #[1 2 3] #["a" "b"]) #[#(1 "a") #(2 "b")]
course-check "equal lengths" (-> zip #[:x :y] #[10 20]) #[#(:x 10) #(:y 20)]
course-check "one empty" (-> zip #[] #[1 2]) #[]
```

```hint
`match #(xs ys)` with one arm for "both non-empty": `#(#[x ...xr] #[y ...yr])`. Anything else means one of them ran out.
```
:::
