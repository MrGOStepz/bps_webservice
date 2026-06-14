import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('angular');
  private http = inject(HttpClient);

  callHelloWorld(): void {
    this.http.get('/api/hello', { responseType: 'text' }).subscribe({
      next: (message) => alert(message),
      error: (err) => alert('Error: ' + err.message)
    });
  }
}
