import type { Preview } from '@storybook/nextjs-vite'
import { createElement } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { makeQueryClient } from "../src/lib/query-client";
import "../src/app/globals.css";

const storybookQueryClient = makeQueryClient();

const preview: Preview = {
  decorators: [
    (Story) =>
      createElement(
        QueryClientProvider,
        { client: storybookQueryClient },
        createElement(
          "div",
          {
            "data-role-theme": "user",
            className: "min-h-screen bg-background p-6 text-foreground",
          },
          createElement(Story),
        ),
      ),
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
