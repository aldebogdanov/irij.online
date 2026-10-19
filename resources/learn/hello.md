Irij is a small language on the JVM built around three ideas: **algebraic effects** (every side effect is declared and can be swapped out), **specs** (runtime-checked shapes instead of a static type system), and a **dense, indentation-based syntax** that reads left to right.

Every code block in this course is live. Edit it, then press **Run** (or <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> inside the editor). Your code runs on the irij.online sandbox — the same engine as the [Playground](/playground).

## Your first program

```irij
println "Hello, Irij!"
```

`println` prints a value and a newline. There are no parentheses or commas around the argument: in Irij you call a function by writing its arguments after it, separated by spaces.

Text after `;;` is a comment:

```irij
;; This line is ignored.
println "Comments start with two semicolons"  ;; and can follow code
print "print does not add a newline, "
println "println does."
```

## Expressions have values

Everything in Irij is an expression. When the last line of a program is an expression, the course shows its value after `=>`:

```irij
1 + 2 * 3
```

Strings join with `++`, and `to-str` turns any value into a string:

```irij
"Irij " ++ "is " ++ to-str 2026
```

Inside double quotes, `${...}` interpolates any expression:

```irij
name := "Ada"
println "Hello, ${name}! 6 × 7 = ${6 * 7}"
```

(`name := "Ada"` gives a name to a value — the next lesson covers bindings.)

## Grouping arguments

Function application binds tighter than any operator. So this does **not** print 3 — it prints 1, then tries to add 2 to the result of `println`, which is `()` (nothing):

```irij fails
println 1 + 2
```

Wrap the argument in parentheses, or use `~`, which means "apply the function to everything on my right":

```irij
println (1 + 2)
println ~ 1 + 2
println ~ "The answer is " ++ to-str (6 * 7)
```

`~` saves a pair of parentheses and keeps lines flat. You will see it everywhere.

:::exercise hello Say hello
Print exactly `Hello, Irij!` (with the comma and the exclamation mark).

```irij starter
;; Print the greeting below.

```

```irij solution
println "Hello, Irij!"
```

```text expect
Hello, Irij!
```

```hint
`println "..."` prints a string and a newline.
```
:::

:::exercise sum-line Show your working
Two numbers are bound for you. Print the line `2 + 3 = 5`, computing the sum from `a` and `b` rather than typing it.

```irij starter
a := 2
b := 3
println "a + b = ?"
```

```irij solution
a := 2
b := 3
println "${a} + ${b} = ${a + b}"
```

```text expect
2 + 3 = 5
```

```hint
Interpolation takes any expression: `"${a + b}"`.
```
:::
