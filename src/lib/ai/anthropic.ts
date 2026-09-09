import Anthropic from "@anthropic-ai/sdk";

// Server-only klient — bere ANTHROPIC_API_KEY iz env. NE uvažaj v "use client"
// datoteke (ključ bi lahko pricurljal v odjemalčev bundle).
export const anthropic = new Anthropic();
