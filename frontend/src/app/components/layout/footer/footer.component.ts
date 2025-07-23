import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `<footer>
  <span class="footer__copyright">
    © 2025 Desenvolvido e mantido pelo Centro de Computação da Aeronáutica de Brasília - CCA-BR
    <a href="https://www.ccabr.intraer/" target="_blank">
      <img src="assets/images/logo-ccabr.png" width="25px" alt="Logo do CCA-BR" />
    </a>
  </span>
</footer>
`,
  styles: [`
      footer {
        background-color: #000000;
        color: #FFFFFF;
        width: 100%;
        height: 2.3rem;
        position: fixed;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
        border-top: 2px solid #ccc;
        z-index: 1;
      }

      footer__copyright {
        font-size: 0.9rem;
        opacity: 1;
        display: flex;
        align-items: center;
      }

    .footer__copyright img {
      margin-left: 10px;
    }

    @media (max-width: 767px) {
      footer {
        height: 2.6rem;
        padding: 0 2rem;
      }
    }
  `]
})
export class FooterComponent {}
