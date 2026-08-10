export const calculateCompletion = (data: any, fields: string[]) => {
  let filled = 0;

  const check = (value: any) => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'boolean') return true; 
    if (typeof value === 'number') return true; 
    return true;
  };

  fields.forEach(field => {
    // Handle nested fields with dot notation
    const fieldParts = field.split('.');
    let fieldValue = data;
    
    for (const part of fieldParts) {
      if (fieldValue && fieldValue[part] !== undefined) {
        fieldValue = fieldValue[part];
      } else {
        fieldValue = undefined;
        break;
      }
    }

    if (check(fieldValue)) filled++;
  });

  const percentage = Math.round((filled / fields.length) * 100);
  return percentage;
};
