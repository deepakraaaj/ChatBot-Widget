import { configureStore } from "@reduxjs/toolkit";

import chatReducer, { ChatState } from "./chatSlice";

function createWidgetStore() {
  return configureStore({
    reducer: {
      chat: chatReducer,
    },
  });
}

type WidgetRootState = {
  chat: ChatState;
};

export type { WidgetRootState };
export { createWidgetStore };
