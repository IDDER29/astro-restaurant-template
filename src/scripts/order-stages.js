/**
 * Convert an array of stage name strings to a plain object keyed by index.
 * @param {string[]} values
 * @returns {Object}
 */
export function buildStagesObject(values) {
  const obj = {};
  values.forEach((v, i) => { obj[i] = v; });
  return obj;
}
