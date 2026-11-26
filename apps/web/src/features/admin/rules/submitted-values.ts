/**
 * Textos que o formulário enviou, devolvidos no estado de erro da action. O React 19 reinicia os
 * campos não controlados quando a action termina, mesmo que ela devolva erro: com o que foi enviado
 * no `defaultValue`, o reinício volta ao que a pessoa digitou, e não ao valor salvo.
 */
export type SubmittedValues = Readonly<Record<string, string>>;

// Os campos que o React e o Next acrescentam para identificar a action começam com "$".
const FRAMEWORK_FIELD_PREFIX = '$';

export function readSubmittedValues(formData: FormData): SubmittedValues {
  const values: Record<string, string> = {};
  formData.forEach((value, name) => {
    if (typeof value === 'string' && !name.startsWith(FRAMEWORK_FIELD_PREFIX)) values[name] = value;
  });
  return values;
}

/** Valor inicial de cada campo: o que foi enviado no último envio recusado ou, sem ele, o salvo. */
export function fieldDefaults(submitted: SubmittedValues | undefined) {
  return {
    text: (name: string, saved: string): string => submitted?.[name] ?? saved,
    // O navegador só envia a caixa marcada: num envio recusado, a ausência significa desmarcada.
    checked: (name: string, saved: boolean): boolean =>
      submitted ? submitted[name] === 'on' : saved,
  };
}
