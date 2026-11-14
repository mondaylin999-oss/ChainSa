// Browser-safe public API of the EarthLens chat feature.
// Server code lives in ./server and must only be imported from route handlers.
export { ChatWidget, type ChatWidgetProps } from "./components/ChatWidget";
export { useEarthLensChat } from "./client/useEarthLensChat";
export { REGIONS, getRegion, type Region } from "./regions";
export { UI_STRINGS, detectLang } from "./i18n";
export type * from "./types";
