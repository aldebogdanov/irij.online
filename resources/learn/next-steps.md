Time to put the pieces together: specs to model the data, pure functions for the rules, an effect for the outside world, and handlers that make the whole thing testable. Then: how to take Irij off the browser and onto your machine.

## Capstone: a vending machine

The machine accepts coins, and when you've paid enough it drops your item and shows your change. We'll build it in two steps.

**Step 1 — the pure core.** Coins are a sum spec; their value and the amount paid are plain functions with no effects at all.

:::exercise coins Count the coins
Declare `spec Coin` with three variants, `Nickel`, `Dime` and `Quarter`, worth 5, 10 and 25 cents. Write `coin-value :: Coin Int` and `paid :: #[Coin] Int`, the total value of a vector of coins (0 for none).

```irij starter
fn coin-value
  (c -> 0)

fn paid
  (coins -> 0)
```

```irij solution
spec Coin
  Nickel
  Dime
  Quarter

fn coin-value :: Coin Int
  Nickel => 5
  Dime => 10
  Quarter => 25

fn paid :: #[Coin] Int
  (coins -> coins |> @ coin-value |> fold (acc v -> acc + v) 0)
```

```irij check
course-check "a quarter" (-> coin-value Quarter) 25
course-check "a nickel" (-> coin-value Nickel) 5
course-check "two quarters and a dime" (-> paid #[Quarter Quarter Dime]) 60
course-check "no coins" (-> paid #[]) 0
```

```hint
One arm per variant for `coin-value`. For `paid`, map `coin-value` over the coins and fold the values from 0 — `/+` would fail on an empty vector.
```
:::

**Step 2 — the machine.** Dropping an item and writing to the screen are things the machine *does*, so they're operations of an effect. `buy` uses them, and stays testable: the checks run it under a handler that records what came out and what the screen said, instead of driving real hardware.

:::exercise vending Buy something
Write `buy :: Map #[Coin] (Result Int Int) ::: Machine`. It takes an item (a map with `name` and `price`) and a vector of coins.

- If the coins cover the price: `dispense` the item's name, `display` `"change: N"`, and return `Ok N`, where N is the change.
- Otherwise: `display` `"insert N more"` and return `Err N`, where N is what's missing. Nothing is dispensed.

```irij starter
spec Coin
  Nickel
  Dime
  Quarter

fn coin-value :: Coin Int
  Nickel => 5
  Dime => 10
  Quarter => 25

fn paid :: #[Coin] Int
  (coins -> coins |> @ coin-value |> fold (acc v -> acc + v) 0)

effect Machine
  dispense :: Str -> ()
  display :: Str -> ()

fn buy :: Map #[Coin] (Result Int Int) ::: Machine
  => item coins
  Err 0
```

```irij solution
spec Coin
  Nickel
  Dime
  Quarter

fn coin-value :: Coin Int
  Nickel => 5
  Dime => 10
  Quarter => 25

fn paid :: #[Coin] Int
  (coins -> coins |> @ coin-value |> fold (acc v -> acc + v) 0)

effect Machine
  dispense :: Str -> ()
  display :: Str -> ()

fn buy :: Map #[Coin] (Result Int Int) ::: Machine
  => item coins
  total := paid coins
  if (total >= item.price)
    dispense item.name
    display ("change: " ++ to-str (total - item.price))
    Ok (total - item.price)
  else
    display ("insert " ++ to-str (item.price - total) ++ " more")
    Err (item.price - total)
```

```irij check
handler course-machine :: Machine
  tray :! #[]
  screen :! #[]
  dispense name =>
    tray <- conj tray name
    resume ()
  display text =>
    screen <- conj screen text
    resume ()

course-cola := {name= "cola" price= 60}
course-r1 := with course-machine do (buy course-cola #[Quarter Quarter Dime Dime])
course-check "returns the change" (-> course-r1) (Ok 10)
course-check "the cola came out" (-> course-machine.tray) #["cola"]
course-check "the screen showed the change" (-> course-machine.screen) #["change: 10"]
course-r2 := with course-machine do (buy course-cola #[Dime])
course-check "not enough money" (-> course-r2) (Err 50)
course-check "nothing more came out" (-> course-machine.tray) #["cola"]
course-check "the screen asked for more" (-> last course-machine.screen) "insert 50 more"
```

```hint
Start with `total := paid coins`, then a block `if (total >= item.price)` whose branches perform the operations and end with `Ok …` or `Err …` — the block's last line is the function's result.
```
:::

Look at what you have: the rules (`coin-value`, `paid`) are pure and trivially testable; the behaviour (`buy`) is tested without a single real side effect; and the signature `fn buy :: Map #[Coin] (Result Int Int) ::: Machine` tells any reader what it takes, what it answers — change on success, the shortfall on failure — and exactly what it can touch. A production handler for `Machine` — talking to a serial port through a cap (lesson 15) — slots in without changing `buy` at all.

## Running Irij on your machine

Irij needs a JDK 21 or newer and git. Build it and put the `irij` launcher on your `PATH`:

```sh
git clone https://github.com/aldebogdanov/irij.git
cd irij
./gradlew install
```

That installs `~/.local/bin/irij`. Then:

```sh
irij --version          # check the install
irij                    # the interactive REPL
irij hello.irj          # run a file
irij test               # run tests/test-*.irj
irij build              # package a self-contained JAR
```

The [home page](/#install) has the full list of commands and editor setup — VS Code and Emacs both get highlighting, a language server and a REPL.

## Tests

`irij test` runs every `tests/test-*.irj` file. A test file uses `std.test`: each `test` takes a name and a thunk of assertions, and `summarize` reports them:

```irij
use std.test {test assert-eq summarize}

fn add
  (a b -> a + b)

r1 := test "adds" (-> assert-eq 4 (add 2 2))
r2 := test "commutes" (-> assert-eq (add 1 2) (add 2 1))
r3 := test "a deliberately wrong one" (-> assert-eq 5 (add 2 2))
summarize #[r1 r2 r3]
```

Everything from the last three lessons applies: test effectful code by running it under recording handlers, exactly as the vending machine checks did.

## Where next

- **[Playground](/playground)** — a persistent REPL session in the browser, with examples and shareable links.
- **[Docs](/docs)** — how Irij works under the hood: the bytecode compiler, how effects become state machines, specs, modules, concurrency.
- **[Seeds](/seeds)** — packages published by the community, and how to publish your own.
- **Model-based testing** — the `model` declaration binds a [Quint](https://quint-lang.org/) specification to your code and replays generated traces against it. See `examples/quint.irj` in the repository.
- **[GitHub](https://github.com/aldebogdanov/irij)** — the language specification (`docs/irij-lang-spec.org`), examples, and issues.

Thanks for working through the course. Go build something — and declare its effects.
