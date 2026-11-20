/** Strip the minimal inline markup used in lesson text. */
export const plain = (text: string) => text.replace(/\*\*|`/g, '');
