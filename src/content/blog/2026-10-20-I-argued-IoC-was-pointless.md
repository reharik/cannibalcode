---
title: "I argued IoC was pointless in JavaScript, forgetting I’d published my own container to npm."
description: "Why I built ioc-manifest: convention-based DI codegen for TypeScript and Awilix."
pubDate: "Oct 20 2026"
---

_Why I built ioc-manifest: convention-based DI codegen for TypeScript and Awilix._

Some weeks ago I had a job interview.

We were chatting away — this is the tech stack we use, and this lib and that lib, and we use Awilix for IoC.

"Really," I said. "You use IoC?"

Inversion of control. In JavaScript.

"Nobody uses IoC in JavaScript. What would you even use it for? You've got that delightful ES6 modules implementation that almost does some of what you wish it did. I mean, I get why you _might_ want to use it. But nobody does. You'll be fighting every engineer you come across."

_What a dunce,_ I thought.

"Yes, we use IoC, and every developer I know uses it. If they don't use a library they at least wire up a poor man's container."

_What a dunce,_ he thought.

Well. That interview went really well.

When I started using Node about ten years ago I came from C#, where I'd used IoC heavily. In Node I found not just little appetite for it but open hostility — the very notion that JavaScript might have the same concerns and patterns as, say, any other language was contemptible. So I wrote my own container. Screw 'em. Eventually, once I finally accepted I was never going to win this me-against-the-whole-world battle, I quietly succumbed.

By the time I was sitting in that room I'd licked my wounds into well-worn calluses. But somewhere in my primordial brain I could still hear, or smell, the memory of why IoC was worth having in the first place. So when this guy told me he was using it, my ears perked up.

I looked up Awilix.

Hm. Not bad. Lets me use functions instead of classes ( don't get me started on classes in JS ) and basically wrap a module in a factory and feed it the dependencies.

Wait a minute!

That's what I wrote almost a decade ago! It was called dagon and it's still pulling eight downloads a week on npm.

Awilix is better than dagon no doubt. Mine was pretty naive. Errors surfaced at runtime, dependencies resolved by filename, magic strings abounded -- and nothing checked any of it, because there was nothing to check it _with_. I mean TypeScript existed but I didn't know what the hell it was back then.

Awilix has TypeScript. Sort of. It has types for its APIs. But the container itself is a bag of strings, and the graph inside it is invisible to the compiler. You still find out what's wrong by running the program and reading a stack trace. Which, to be fair, is what every container in this ecosystem does.

So I decided to give it a try.

It wasn't long before the old muscle memory started to kick in and the joy of design to interfaces and other patterns started to return. But one thing I just couldn't get past was writing the same dependency name over and over to configure it. And I soon started running into problems around packages in my mono-repo. Registrations split across packages, no way to express that one supplies what another demands — so you find out you’ve broken the contract when the app that composes them fails to boot.

One thing I really loved about StructureMap in C# was how it was configured mostly by convention with configuration only for the edge cases. Awilix has `loadModules`. But in C#, convention-based registration is safe because the consumer side is typed independently of the container. A constructor taking `ILogger` is checked by the compiler whether StructureMap wired it or I did. In TypeScript, a factory destructuring `{ logger }` from a cradle has no type of its own — so convention-based loading means giving up the only check you had. You can have conventions or you can have types. Not both. Again things break at runtime not at design time.

It seemed to me that a lot of this and more could be handled with a quick codegen step. A lot of libraries require codegen these days e.g. graphql with ts, prisma. Adding one more especially if the payoff is really high seemed an easy decision. So I created what I considered an optimal configuration scenario. Largely stolen from StructureMap :).

I wanted modules to be as container-agnostic as possible, while still being discoverable, but I also needed to distinguish between what goes in a container and what doesn't. Adopting a configurable naming convention was the easiest and best solution for that. So I decided a declared function should look like this:

```ts
type AddUserDeps = {
  db: Database;
  logger: Logger;
};

export type AddUser = (user: NewUser) => Promise<void>;

export const build__addUser =
  ({ db, logger }: AddUserDeps): AddUser =>
  async (user) => {
    ...
  };
```

Here the `build__` prefix is what marks a function as container-eligible. I started with just `build`, but I kept writing `buildQuery` and `buildPath` for things that had no business in a container. The double underscore made the distinction unambiguous — and visually obvious at a glance. You can configure it to whatever you like.

Classes work the same way. `implements` declares the contract, the constructor’s deps object declares the demands, and the codegen reads both. The convention is about what gets registered, not how you write it.

The beauty is that this is how I’d define the module anyway. You have to declare your inputs. You have to declare your outputs. The codegen reads both and builds the container from them. Nothing is declared twice. The type is the registration.

And here's the payoff:

```ts
type UserServiceDeps = {
  addUser: AddUser;
};

export type UserService = (input: SomeInput) => Promise<void>;

export const build__userService =
  ({ addUser }: UserServiceDeps): UserService =>
  async (input) => {
    ...
  };
```

addUser is wired. Not written into a registration, not added to a cradle interface. Just declared as the type that it is.

I also spent considerable effort on how errors are expressed. A cryptic error at runtime makes me crazy. Because we can accrue so much information from the AST walk while building the graph, the error messages can be very explicit.

```
[externals] Unsatisfied: nothing supplies "logger", which @apps/api expects the container to already have.
  key:       "logger"  demanded by @apps/api
  demanded:  Logger
  No composed manifest offers this key in its IocGeneratedCradle.
  Suggested fix: Register a factory for Logger under key "logger" in this app, or compose another manifest that supplies it.
  → docs: https://reharik.github.io/ioc-manifest/monorepo/composition#externals
```

And this error comes during the build, not at runtime. Missing dependencies, cyclic references, and lifetime violations are all caught and reported with the file, the line and the fix.

A runtime-only container can’t come close to this. It has keys and nothing else — no file, no line, no idea which package expected what. Furthermore, runtime errors only show up when they happen, one at a time. With in-depth build-time analysis you get all the errors up front whether they are exercised or not.

The build-time graph doesn't just catch things early, it makes the runtime errors legible too. If your code does make it to runtime with an issue:

```
[ioc] Cannot resolve dependency "readRepository".

Resolution chain:
Server (server) [src/server.ts]
  -> KoaServer (koaServer) [src/koaServer.ts]
    -> GraphQLServer (graphQLServer) [.../createGraphQLServer.ts]
      -> readRepository ✖ no registered implementation
```

So here I am, ten years later, having written the same library twice.

dagon walked a directory and named things after their files. It worked, for the most part, until it threw at startup with an error message that was barely comprehensible. I knew what I wanted — convention over configuration, modules that don’t know a container exists, functionality with a decent DX. I just didn't have the tools or the Node experience to really make it happen.

Many years later, knowing the language much better, I find that TypeScript’s AST knows what every module declares and what every module demands. ioc-manifest just reads it and hands Awilix a container it couldn’t have built for itself — one the compiler can see, and complain about, before anything runs.

It may not have been my finest hour or best interview, but I'm now happily back in the land of IOC.

```
npm install ioc-manifest
```
