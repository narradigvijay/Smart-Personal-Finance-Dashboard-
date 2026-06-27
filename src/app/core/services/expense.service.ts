import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private apiUrl = environment.apiUrl + '/expenses';

  http = inject(HttpClient);
  authService = inject(AuthService);

  constructor() {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });
  }

  addExpense(expense: any): Observable<any> {
    return this.http.post(this.apiUrl, expense, { headers: this.getHeaders() });
  }

  getExpenses(params: any): Observable<any> {
    return this.http.get(this.apiUrl, { headers: this.getHeaders(), params });
  }

  getExpense(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  updateExpense(id: string, expense: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, expense, {
      headers: this.getHeaders(),
    });
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  parseExpense(text: string): Observable<{ parsed: any }> {
    return this.http.post<{ parsed: any }>(`${this.apiUrl}/parse`, { text }, {
      headers: this.getHeaders(),
    });
  }

  exportExpenses(): void {
    const token = this.authService.getToken();
    const link = document.createElement('a');
    // Use a GET request with fetch so we can pass the Auth header
    fetch(`${this.apiUrl}/export`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        link.href = URL.createObjectURL(blob);
        link.download = 'expenses.csv';
        link.click();
        URL.revokeObjectURL(link.href);
      });
  }
}
