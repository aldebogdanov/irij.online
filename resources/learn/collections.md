Irij's collections are **immutable**: "changing" one gives you a new collection and leaves the old one as it was. They are persistent data structures underneath, so a new version shares almost everything with the old one — adding an element is cheap, not a copy.

| Kind | Literal | Good for |
|---|---|---|
| Vector | `#[1 2 3]` | an ordered sequence |
| Map | `{name= "Ada" age= 36}` | named fields, lookups |
| Set | `#{:red :green}` | membership, no duplicates |
| Tuple | `#(1 "one" :odd)` | a fixed handful of mixed values |
| Range | `1..10`, `0 ..< 10` | a run of integers |

## Vectors

Elements are separated by spaces. Indexes start at 0.

```irij
langs := #["Irij" "Clojure" "Haskell" "Koka"]
println (length langs)
println (head langs)
println (tail langs)
println (last langs)
println (nth 1 langs)
println (get 9 langs)
```

Printed on its own, a string is just its text; inside a collection it keeps its quotes, so `#["a b" "c"]` can't be mistaken for three words. `inspect` gives that quoted form for any value:

```irij
println "a b"
println #["a b" "c"]
println {name= "Ada" tags= #["math" ""]}
println (inspect "a b")
```

`nth` fails on an index that isn't there; `get` returns `()` instead. `head` of an empty vector is an error too — check with `empty?` first.

Adding and combining always returns a new vector:

```irij
v := #[3 1 2]
w := conj v 4
println v
println w
println (v ++ #[10 20])
println (sort w)
println (reverse w)
println (take 2 w)
println (drop 2 w)
println (contains? w 4)
```

Two things to know about vector literals: a function call inside one needs parentheses — `#[(f x) (g y)]` — and so does a negative number: `#[(-1) 2]`. Otherwise `#[f x]` would be two elements, `f` and `x`.

## Maps

A map literal is a list of `field= value` pairs (the `=` sticks to the field name). Read a field with a dot, or with `get`:

```irij
ada := {name= "Ada Lovelace" born= 1815 field= "mathematics"}
println ada.name
println (get "born" ada)
println (keys ada)
println (contains? ada "born")
println ada.missing
```

A missing field reads as `()`. To build a new map from an old one, **spread** it with `...` and list what changes or is added — the original is untouched:

```irij
ada := {name= "Ada Lovelace" born= 1815}
older := {...ada born= 1816 known-for= "the first program"}
println older
println ada
```

`assoc`, `dissoc` and `merge` do the same jobs as functions, which is handy when the key is computed at run time:

```irij
stock := {apples= 3}
key := "pears"
println (assoc stock key 4)
println (dissoc {a= 1 b= 2} "a")
println (merge {a= 1} {b= 2})
```

A map literal must fit on one line. To spread a long one over several, end each line with a backslash `\`.

## Sets, tuples and ranges

A **set** keeps each value once and answers "is it in there?" quickly:

```irij
seen := #{"ada" "grace"}
println (contains? seen "ada")
println (conj seen "grace")
println (to-set #[1 2 2 3 3 3])
```

A **tuple** is a small fixed group of values. Take one apart by binding a tuple pattern:

```irij
point := #(3 4)
#(x y) := point
println (x * x + y * y)
```

A **range** is a lazy run of integers: `1..5` includes 5, `0 ..< 5` stops before it. Wrap a range in parentheses when you pass it to a function:

```irij
println (to-vec (1..5))
println (to-vec (0 ..< 5))
println (take 3 (1..1000000))
```

## Nesting

Collections nest freely. A vector of maps is the everyday shape of data:

```irij
people := #[{name= "Ada" langs= #["Analytical Engine"]} {name= "Grace" langs= #["COBOL" "FLOW-MATIC"]}]
grace := nth 1 people
println grace.name
println (length grace.langs)
```

:::exercise rotate Rotate
Write `rotate`, which moves the first element of a vector to the end: `rotate #[1 2 3]` is `#[2 3 1]`. An empty vector stays empty.

```irij starter
fn rotate
  (xs -> xs)
```

```irij solution
fn rotate
  => xs
  if (empty? xs)
    xs
  else
    conj (tail xs) (head xs)
```

```irij check
course-check "three numbers" (-> rotate #[1 2 3]) #[2 3 1]
course-check "one element" (-> rotate #["solo"]) #["solo"]
course-check "empty" (-> rotate #[]) #[]
```

```hint
`tail xs` is everything after the first element; `conj` adds to the end. Guard against the empty vector with `empty?` before calling `head`.
```
:::

:::exercise birthday Happy birthday
Write `birthday`, which takes a person map with `name` and `age` fields and returns a new map with `age` one higher. Everything else stays the same.

```irij starter
fn birthday
  (p -> p)

println (birthday {name= "Ada" age= 36})
```

```irij solution
fn birthday
  (p -> {...p age= p.age + 1})

println (birthday {name= "Ada" age= 36})
```

```irij check
course-check "Ada turns 37" (-> birthday {name= "Ada" age= 36}) {name= "Ada" age= 37}
course-check "other fields survive" (-> (birthday {name= "Grace" age= 85 rank= "admiral"}).rank) "admiral"
```

```hint
Spread the old map and override one field: `{...p age= ...}`.
```
:::

:::exercise restock Restock
`stock` maps item names to quantities. Write `add-stock`, taking the stock map, an item name (a string) and a quantity, that returns the map with the quantity added — starting from 0 for an item that isn't there yet.

```irij starter
fn add-stock
  => stock item qty
  stock
```

```irij solution
fn add-stock
  => stock item qty
  current := if (contains? stock item) (get item stock) else 0
  assoc stock item (current + qty)
```

```irij check
course-check "more apples" (-> add-stock {apples= 3} "apples" 2) {apples= 5}
course-check "new pears" (-> add-stock {apples= 3} "pears" 4) {apples= 3 pears= 4}
course-check "into an empty store" (-> add-stock {} "figs" 1) {figs= 1}
```

```hint
The item name is in a variable, so use `get item stock` and `assoc stock item value` rather than a dot or a literal.
```
:::
