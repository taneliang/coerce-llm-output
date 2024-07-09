# @elg/coerce-llm-output

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/taneliang/coerce-llm-output/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/taneliang/coerce-llm-output/tree/main)
[![codecov](https://codecov.io/github/taneliang/coerce-llm-output/graph/badge.svg?token=Vry55xt2Xs)](https://codecov.io/github/taneliang/coerce-llm-output)

`coerceLlmOutput` makes it possible to use LLM output in a typesafe way by coercing it into a well-typed and validated JSON object or array.

## Installation

```sh
npm install @elg/coerce-llm-output zod
```

OR

```sh
yarn add @elg/coerce-llm-output zod
```

## Usage

### Basic usage with OpenAI

```typescript
import { coerceLlmOutput } from "@elg/coerce-llm-output";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI();

const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

async function main() {
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content:
          "Generate a JSON user object with the shape " +
          "{ id: string; name: string; email: string }",
      },
    ],
  });

  const output: z.infer<User> = coerceLlmOutput(
    chatCompletion.choices[0].message,
    User,
  );
}

main();
```

### Streaming

```typescript
import { coerceLlmOutput } from "@elg/coerce-llm-output";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI();

const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

async function main() {
  const stream = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content:
          "Generate a JSON user object with the shape " +
          "{ id: string; name: string; email: string }",
      },
    ],
    stream: true,
  });
  for await (const chunk of stream) {
    const output: z.infer<User> = coerceLlmOutput(
      chunk.choices[0].message, // TODO: Check if this works? Otherwise use chunk.choices[0].delta.content
      User,
    );
    // process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

main();
```

### Arrays

```typescript
import { coerceLlmOutput } from "@elg/coerce-llm-output";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI();

const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

async function main() {
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content:
          "Generate a JSON array of users. Each user must have the shape " +
          "{ id: string; name: string; email: string }",
      },
    ],
  });

  const output: z.infer<User>[] = coerceLlmOutput(
    chatCompletion.choices[0].message,
    z.array(User),
  );
}

main();
```

## Functionality

`coerceLlmOutput`:

1. Extracts JSON-like content.
2. Parses incomplete JSON (using the excellent [partial-json](https://www.npmjs.com/package/partial-json)).
3. Fixes up keys in the parsed JSON object to match the keys in the zod schema. We do this because LLMs sometimes generate camelCased or snake_cased, or wrongly cased keys unexpectedly.
4. Parses the JSON object using the provided zod schema.
