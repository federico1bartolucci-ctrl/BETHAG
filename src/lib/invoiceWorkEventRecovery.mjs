export function shouldCreateInvoiceLinkedEvent(existingEvent) {
  return !existingEvent?.id;
}
