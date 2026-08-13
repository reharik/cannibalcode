---
title: "Your status enum lives in five files"
description: "And the as const trick everyone reaches for only fixes one of them"
pubDate: "Aug 14 2026"
---

You need to add one value to a status. `PENDING`, `AWAITING_PAYMENT`, `ACTIVE`, `SUSPENDED` — and now `ARCHIVED`.

So you go looking for where statuses live. Here's what you find:

- `constants.ts` — a frozen const object, `ORDER_STATUS`, screaming case.
- `types.ts` — a union of string literals, written by someone else, with the same members in a different order.
- `orderService.ts` — a switch with the literals inlined, because whoever wrote it didn't find either of the above.
- `migrations/0031_orders.ts` — a `CHECK` constraint listing the values a third time, in SQL.
- `OrderFilter.tsx` — a `<select>` with hardcoded `<option>` elements, and display labels — someone typed _Awaiting payment_ by hand — that exist nowhere else in the codebase.

Five representations. None of them is the source of truth.

The problem isn't which of the five you pick. It's that there's no canonical place or shape for this kind of data, so the concept gets re-invented every time someone needs it, and none of the copies know about each other.

That hurts in three ways, and they get worse.

**It's tedious.** Adding `ARCHIVED` means touching all five, and nothing — not the compiler, not a test — will tell you when you've found four.

**It's undiscoverable.** Six months ago someone needed this same concept, searched for `OrderStatus`, found nothing, and added `OrderState` in a different file. Now there are six. Nobody knows. It'll surface as a bug in about a year.

Or alternatively you're the one adding it fresh. You know the concept doesn't exist yet. You also know that whichever form you pick, the next person won't find it, and you'll be back here. So you sit there for four minutes deciding between a const object and a union and an actual `enum`, aware the whole time that the decision doesn't matter and the discoverability does. That friction is small and constant, and it never stops, and it is entirely self-inflicted.

**It's silently wrong.** This is the big one.

The migration seeds rows as `'archived'`. The union says `'ARCHIVED'`. The filter compares them, matches nothing, and archived orders quietly stop appearing in the list. No error. No exception. No failing test.

Postgres is satisfied: the value passes the `CHECK` constraint, which was written in SQL by someone reading a different file. TypeScript is satisfied: the row was cast to `OrderStatus` on the way in, and a cast is a promise, not a check. Both halves of the system are internally consistent, they disagree with each other, and there is no layer whose job it is to notice.

That's not just a maintenance burden. It's a bug class — two independent declarations of the same truth, in two languages, that no tool compares.

## The thing everyone writes

You've written this. I've written it in every codebase I've worked in:

```ts
export const ORDER_STATUS = {
  PENDING: "PENDING",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
```

It's a good trick. It gets you a value you can iterate and a type you can annotate with, from one declaration.

Then you keep going, and watch what it doesn't cover:

```ts
// Display labels: somewhere else entirely.
const STATUS_LABELS: Record<OrderStatus, string> = { ... };

// Dropdown options: a third shape, derived by hand.
const options = Object.values(ORDER_STATUS).map(v => ({
  value: v,
  label: STATUS_LABELS[v],
}));

// Parsing a string from the database: unchecked.
const status = row.status as OrderStatus;   // 👈 a lie, and it will bite

// Exhaustiveness: only if you remember the incantation.
default: {
  const _exhaustive: never = status;
  throw new Error(`unhandled: ${status}`);
}
```

So the const-object trick solved _one_ of the five places. The labels, the options, the parse boundary, and the exhaustiveness check each grew their own file. You've replaced "five representations of the values" with "one representation of the values and four satellites that drift from it."

And the drift is worse than it looks. Add `ARCHIVED` and `STATUS_LABELS` fails to compile — good. But nobody _chose_ that. `Record<OrderStatus, string>` just happens to be exhaustive by construction; the safety is an accident of how the type got written. The `<select>` doesn't fail. The `as OrderStatus` cast doesn't fail. The `CHECK` constraint doesn't fail.

So some of your satellites break loudly and some break silently, for reasons that have nothing to do with which ones matter — and you can't tell which is which by looking. Worse, the ones that break loudly give you false confidence about the ones that don't. You add a value, something turns red, you fix it, the build goes green, and you ship the bug anyway.

## One declaration, and the satellites come with it

```ts
export type OrderStatus = Enumeration<typeof OrderStatus>;
export const OrderStatus = enumeration("OrderStatus", {
  input: ["pending", "awaitingPayment", "active", "suspended"],
});
```

**The string `'OrderStatus'` isn't redundant with the variable name.** JavaScript has no reflection — a function can't know what it's being assigned to — and while that drives me absolutely insane, it's only half the reason. The real reason is that this string is the wire tag. It survives JSON. It's what lets a value that crossed a process boundary be recognized as an `OrderStatus` when it comes back, rather than as a string that happens to look like one.

**The type alias looks circular and isn't.** TypeScript resolves types and values in separate namespaces, so `OrderStatus` is legally both. That one line is what buys you the parameter annotation further down.

Those two lines produce three representations of the concept, all derived from the one you typed:

```ts
OrderStatus.awaitingPayment.key; // 'awaitingPayment'   — code: the name you reach for
OrderStatus.awaitingPayment.value; // 'AWAITING_PAYMENT'  — persistence: the column, the wire
OrderStatus.awaitingPayment.display; // 'Awaiting payment'  — human: the label, the dropdown
```

Both casing conventions are defaults, and both are overrideable for when a column or a label has to be something else.

Those three are exactly what got scattered across five files. The const object and the union hold the persistence form. The switch inlines it again. The migration writes it a third time, in SQL. The `<select>` holds the human form, typed out by hand. And the code form — the name you actually reach for — is whatever each file happened to call it.

Here's the part that should bother you: the three aren't independent. `awaitingPayment` → `AWAITING_PAYMENT` → `Awaiting payment` is a mechanical transformation. You could write it as a function in about four lines.

Nobody does. Instead, every developer who needs one of the forms types it out themselves, in a different file, from memory. The convention lives in everyone's head and in no code — so as far as the toolchain is concerned, the `AWAITING_PAYMENT` in the migration and the `AWAITING_PAYMENT` in the union are two unrelated string literals that happen to look alike. Nothing compares them.

That's `'archived'` versus `'ARCHIVED'` from the top of this post. Not a hard problem solved wrong. A trivial problem solved by hand, twice, by two people who never compared notes.

Here they're one member. You can't have one representation without the others, because there's nowhere else to put them.

Everything the const-object trick left on the floor is now on the enum itself. Same list, same order:

The `<select>` with hardcoded options and hand-derived labels becomes:

```ts
OrderStatus.toOptions();
// [{ value: 'AWAITING_PAYMENT', label: 'Awaiting payment' }, ...]
```

The cast at the database boundary is now:

```ts
OrderStatus.fromValue(row.status);
```

A cast is a promise. This is a check — it parses, and it rejects anything that isn't a member.

And the exhaustiveness incantation — the `never` assignment and the throw you have to remember to write — becomes a method on the member:

```ts
const banner = status.match({
  pending: () => "Waiting to be processed",
  awaitingPayment: () => "Payment not received",
  active: () => "In progress",
  suspended: () => "On hold",
});
```

The arms are keyed by the code representation — `awaitingPayment`, the name you reach for — not the wire value. Add `archived` to the enum and every `match` that doesn't handle it turns red until you add an arm. That's the same guarantee the `never` incantation gave you, except you don't write it, you can't forget it, and it returns a value instead of assigning into a mutable `let`.

And the `CHECK` constraint that disagreed in a different case: there is exactly one `.value`, produced by the enum. The migration and the filter can't disagree, because neither of them is holding its own copy of the string.

Because the type and the value share a name, you use it the way you'd use a real enum:

```ts
const describe = (status: OrderStatus) => status.display;

describe(OrderStatus.pending);
```

That's four satellites collapsed. But the thing that actually mattered is duller than any of it: this is now data with a shape, so it has somewhere to live.

```
/enums/OrderStatus.ts
```

One file. Named after the concept. The next person who needs an order status finds it in one search, in one shape, with the labels already attached — and never writes `OrderState`.

And adding `ARCHIVED`? You add `'archived'` to the array. That's the change. No labels file to update, no `<select>` to audit, no migration to keep in sync, no cast to re-verify. The edit that used to take five files and a prayer takes one file and a typecheck.

None of this is novel. The casing convention was always mechanical, the labels were always derivable, and the concept always wanted one home. All that changed is that a thing you were doing by hand in five files is now done once, by code, where nothing can disagree with it.

The library does more — a member that goes out over the wire comes back as the same member. That's the next post.

## Why I wrote it

The pattern isn't mine. "Smart enum" / "rich enum" has been written about for years, mostly by people working in C# and Java. I was introduced to the concept way back in the day by [Jeremy Miller](https://jeremydmiller.com/about/) and the [Los Techies](https://lostechies.com/) crew — that's where I learned that an enum could carry behavior as well as data.

The JS and TypeScript writeups I've found are good at explaining _why_ `enum` is a bad fit and what you'd want instead. Then they either stop at the const-object trick, which is where the drift starts, or they show a quick roll-your-own version that whets your appetite without getting you there. The real implementation, especially with all the TypeScript goodness, is a good deal harder to write. But once you've got it, it's still lightweight and easy to use.

My first implementation was in JS, long ago, and it was simple to write and easy to use. When TypeScript came along and the code had to get serious about what it was doing — that was a lift. I learned an insane amount about TypeScript while pulling my eyes out. I've been running it in production in a real application for months, which makes me the library's author and its most annoyed user. Every capability in it exists because the app needed it and the absence hurt. Dogfooding made it very clear what was necessary, what was silliness, and where there be dragons. Those stories are worth telling on their own, and I'll get to them.

But this is the flat version: one canonical, discoverable, behavior-carrying declaration per concept, instead of five representations and four satellites.

```
npm install @reharik/smart-enum
```

---

_Next in this series: what happens when a smart enum crosses a serialization boundary and `===` quietly starts returning `false`._
