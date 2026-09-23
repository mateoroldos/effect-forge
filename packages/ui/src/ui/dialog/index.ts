import { Dialog as DialogPrimitive } from "bits-ui";
import Content from "./dialog-content.svelte";
import Header from "./dialog-header.svelte";
import Title from "./dialog-title.svelte";
import Description from "./dialog-description.svelte";

const Root = DialogPrimitive.Root;
const Trigger = DialogPrimitive.Trigger;

export { Root, Trigger, Content, Header, Title, Description };
