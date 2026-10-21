---
title: "Why your monorepo has two copies of your singleton"
description: "=== was true in dev and false in prod"
series: smart-enums
pubDate: "Oct 21 2026"
---

Early on when I was building my app [homeroll.app](https://homeroll.app) I had a most unsettling experience. When working in dev everything was lovely. When I started making production/staging builds things got weird. Enums that were most definitely the same, when compared, were returning false. This was a real head scratcher, as I was unable to reproduce the issue in dev.

I use a library that I wrote called [smart-enums ](https://github.com/reharik/smart-enums)to manage constants pretty extensively. I have a package in my monorepo called @packages/enums. This is the central place I keep all constants across the different consumers. Each enum defined once and shared between packages.

It took some Hail Mary's and then some actual thinking to figure it out. My [smart-enums ](https://github.com/reharik/smart-enums) are rich enums. Each member is an object carrying several representations of itself:

```ts
Status.isArchived.key; // 'isArchived'
Status.isArchived.value; // 'IS_ARCHIVED'
Status.isArchived.display; // 'Is archived'
```

So `myObject.status === Status.isArchived` was comparing two objects, not two strings.

The Hail Mary that got me thinking was when I did `myObject.status.value === Status.isArchived.value` it seemed to work. I realised the status objects must not be the same object anymore.

In development, my singleton was in fact a singleton because it was symlinked in each consumer via the monorepo infrastructure. Everyone had a symlink pointing to the same file. Equality was ensured.

In production my build compiled the code for each package and referenced them in the app. This meant each package’s build output carried its own physical copy of `@packages/enums`. e.g. `core` had one and `media-core` had one. Both identical files but not the same file. The `isArchived` that `core` handed back and the `isArchived` that `media-core` handed back were twins, not the same thing. They were, in fact, no longer singletons at all.

When using TS enums, or just const scattered through your code base or as some might call them "dumb-enums" all you have are strings, so even though you have defined them in 5 different places, provided they match the equality holds. This is because strings are primitives, and `===` on primitives compares _values_. `===` on objects compares _references_ . Build a string twice, or five times and it’s still equal to itself. Build an object twice and you have two objects.

I could have just encouraged people to write the verbose .value everywhere, but that would be a trap. Just waiting for someone to forget and go through the same process I just did. Instead what I did was to add a function to the enums `.equals()`. It compares `.value` on both sides — the instances were artifacts of the build, all derived from the same source, so the values always match.

```ts
myObject.status === Status.isArchived; // false in prod
myObject.status.equals(Status.isArchived); // true everywhere
Status.isArchived.equals(myObject.status); // same thing
```

It’s clearly distinct from `===`, so you’re not guessing what the syntax needs to be. But you’re still waiting for someone to forget. The final piece is to add a lint rule that prohibits `===` comparisons for [smart-enums ](https://github.com/reharik/smart-enums) and this I [ship with the library](https://www.npmjs.com/package/@reharik/eslint-plugin-smart-enum).

While this story is about my experiences using smart-enums, ultimately it's about any module-level object you compare by identity — a class you `instanceof`, a `Symbol()` sentinel, a singleton service. The moment your build emits two copies of the file, you have two of them, and `===` stops meaning what you think it means. React’s “invalid hook call” is this bug. So is every `instanceof` that mysteriously returns false in prod.

The usual fix is to fight the bundler: `resolve.dedupe`, `preserveSymlinks`, careful Dockerfiles. That works until the next person touches the build. The fix that sticks is to stop depending on identity: compare by value, make that comparison the easy one to write, and lint the other one out of existence. Do that and the bundler can duplicate whatever it wants — the bug has nowhere to live.
