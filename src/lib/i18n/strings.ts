import type { Dictionary } from "@/lib/i18n/dictionary";
import type { EnquiryStrings } from "@/components/contact/EnquiryForm";

/**
 * Narrow the dictionary down to exactly what a Client Component renders.
 *
 * Props to a Client Component are serialised into the HTML for
 * hydration, so a spread of a whole section quietly publishes every
 * string in it — including copy belonging to pages the visitor is not
 * looking at. Listing the keys is verbose, but the verbosity is the
 * mechanism: adding a string to a dictionary should not silently add it
 * to the wire.
 */
export function enquiryStrings(t: Dictionary): EnquiryStrings {
  return {
    notLiveTitle: t.contact.notLiveTitle,
    notLiveBody: t.contact.notLiveBody,
    sentTitle: t.contact.sentTitle,
    name: t.contact.name,
    yourName: t.contact.yourName,
    whatAbout: t.contact.whatAbout,
    select: t.contact.select,
    training: t.contact.training,
    other: t.contact.other,
    whatDoYouNeed: t.contact.whatDoYouNeed,
    sending: t.contact.sending,
    sendButton: t.contact.sendButton,
    replyPromise: t.contact.replyPromise,
    email: t.apply.fields.email,
    phone: t.apply.fields.phone,
    optional: t.apply.fields.optional,
    message: t.apply.fields.message,
    responseTime: t.common.responseTime,
  };
}
