import dedent from "ts-dedent";
import { z } from "zod";
import {
  recursivelyFixKeysToMatchSchema,
  extractJsonLikeString,
  coerceLlmOutput,
} from "./coerceLlmOutput";

describe(recursivelyFixKeysToMatchSchema, () => {
  it("should fix keys", () => {
    const User = z.object({
      firstName: z.string(),
      lastName: z.string(),
      socials: z.object({
        linkedIn: z.string(),
      }),
      citizenships: z.array(z.string()),
      vehicles: z.array(
        z.object({
          make: z.string(),
          model: z.number(),
          yearOfManufacture: z.number(),
        })
      ),
    });

    const user = {
      first_name: "John",
      last_name: "Smith",
      socials: {
        linkedin: "https://linkedin.com/in/john-smith",
      },
      citizenships: ["Mars", "Jupiter"],
      vehicles: [
        {
          make: "Toyota",
          model: "Corolla",
          year_of_manufacture: 2021,
        },
      ],
    };

    const fixedUser = recursivelyFixKeysToMatchSchema(user, User);
    expect(fixedUser).toEqual({
      firstName: "John",
      lastName: "Smith",
      socials: {
        linkedIn: "https://linkedin.com/in/john-smith",
      },
      citizenships: ["Mars", "Jupiter"],
      vehicles: [
        {
          make: "Toyota",
          model: "Corolla",
          yearOfManufacture: 2021,
        },
      ],
    });
  });
});

describe(extractJsonLikeString, () => {
  it("should extract JSON from a JSON Markdown block", () => {
    const extracted = extractJsonLikeString(
      dedent`
        \`\`\`json
        {
          "first_name": "John",
          "last_name": "Smith"
        }
        \`\`\`
      `
    );

    expect(extracted).toEqual(
      dedent`
        {
          "first_name": "John",
          "last_name": "Smith"
        }
      `
    );
  });

  it("should extract JSON from a JSON Markdown block within other text", () => {
    const extracted = extractJsonLikeString(
      dedent`
        Some words

        \`\`\`json
        {
          "first_name": "John",
          "last_name": "Smith"
        }
        \`\`\`

        Some words
      `
    );

    expect(extracted).toEqual(
      dedent`
        {
          "first_name": "John",
          "last_name": "Smith"
        }
      `
    );
  });

  it("should extract JSON-like string from text", () => {
    const extracted = extractJsonLikeString(
      dedent`
        Some words
        {
          "first_name": "John",
          "last_name": "Smith"
        }
      `
    );

    expect(extracted).toEqual(
      dedent`
        {
          "first_name": "John",
          "last_name": "Smith"
        }
      `
    );
  });

  it("should return entire string if it's JSON", () => {
    const extracted = extractJsonLikeString(
      dedent`
        {
          "first_name": "John",
          "last_name": "Smith"
        }
      `
    );

    expect(extracted).toEqual(
      dedent`
        {
          "first_name": "John",
          "last_name": "Smith"
        }
      `
    );
  });

  it("should return entire string if it's invalid JSON", () => {
    const extracted = extractJsonLikeString("not json");
    expect(extracted).toEqual("not json");
  });
});

describe(coerceLlmOutput, () => {
  it("should coerce LLM output object", () => {
    const User = z
      .object({
        firstName: z.string(),
        lastName: z.string(),
      })
      .deepPartial();

    const user = coerceLlmOutput(
      User,
      dedent`
        Here is a human

        \`\`\`json
        {
          "first_name": "John",
          "last_name": "Smith"
        }
        \`\`\`

        That was a human
      `
    );

    expect(user).toEqual({
      firstName: "John",
      lastName: "Smith",
    });
  });

  it("should coerce LLM output array", () => {
    const NamesArray = z.array(z.string());

    const array = coerceLlmOutput(
      NamesArray,
      dedent`
        Here is a human

        \`\`\`json
        ["John", "Smith"]
        \`\`\`

        That was a human
      `
    );

    expect(array).toEqual(["John", "Smith"]);
  });

  it("should coerce partial LLM output", () => {
    const User = z
      .object({
        firstName: z.string(),
        lastName: z.string(),
      })
      .deepPartial();

    const user = coerceLlmOutput(
      User,
      dedent`
        Here is a human

        \`\`\`json
        {
          "first_name": "John",
          "last_na
      `
    );

    expect(user).toEqual({
      firstName: "John",
    });
  });
});
