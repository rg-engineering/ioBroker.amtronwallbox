// This file extends the AdapterConfig type from "@types/iobroker"

import type { AmtronwallboxConfig } from "./types";




// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {

            wallboxes: AmtronwallboxConfig[];

		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};