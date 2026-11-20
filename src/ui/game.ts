/** The content library, indexed once for the whole UI. */
import { library } from "../content";
import { indexLibrary } from "../sim/library";

export const ix = indexLibrary(library);
