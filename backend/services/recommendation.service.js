export function averageVectors(vectors) {
  const length = vectors[0].length;
  const result = new Array(length).fill(0);

  for (const v of vectors) {
    for (let i = 0; i < length; i++) {
      const value = Number(v[i]);

      if (!isNaN(value) && value !== null) {
        result[i] += value;
      }
    }
  }

  return result.map((x) => x / vectors.length);
}
