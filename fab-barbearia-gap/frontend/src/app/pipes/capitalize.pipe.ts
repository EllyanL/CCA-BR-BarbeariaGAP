import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'capitalize'
})
export class CapitalizePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      return value;
    }
    return value
      .split(' ') // Divide o nome em palavras
      .map(word => {
        // Se a palavra contém um ponto (indicando abreviação), mantém como está
        if (word.includes('.')) {
          return word.toUpperCase();
        } else {
          // Capitaliza a primeira letra e coloca o resto em minúsculas
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
      })
      .join(' '); // Junta as palavras de volta em uma string
  }
}
