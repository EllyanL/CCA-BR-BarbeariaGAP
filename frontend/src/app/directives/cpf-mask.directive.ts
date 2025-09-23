import { Directive, HostListener, ElementRef, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[cpfMask]'
})
export class CpfMaskDirective {
  constructor(
    private el: ElementRef<HTMLInputElement>,
    @Optional() private ngControl: NgControl
  ) {}

  @HostListener('input', ['$event'])
  onInput(): void {
    const input = this.el.nativeElement;
    const digits = input.value.replace(/\D/g, '').substring(0, 11);
    let formattedValue = digits;
    if (formattedValue) {
      formattedValue = formattedValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    this.ngControl?.control?.setValue(formattedValue, { emitEvent: false });
    input.value = formattedValue;
  }
}
