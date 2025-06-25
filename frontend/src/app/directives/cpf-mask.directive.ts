import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[cpfMask]'
})
export class CpfMaskDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  onInput(): void {
    const input = this.el.nativeElement;
    let value = input.value.replace(/\D/g, '').substring(0, 11);
    if (value) {
      value = value
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    input.value = value;
  }
}
