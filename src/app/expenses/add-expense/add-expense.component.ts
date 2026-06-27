import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { BehaviorSubject } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-add-expense',
    imports: [ReactiveFormsModule, FormsModule, RouterLink, AsyncPipe],
    templateUrl: './add-expense.component.html',
    styleUrl: './add-expense.component.scss'
})
export class AddExpenseComponent implements OnInit {
  expenseForm: FormGroup = new FormGroup({});
  categories: string[] = [
    'Groceries',
    'Leisure',
    'Electronics',
    'Utilities',
    'Clothing',
    'Health',
    'Others',
  ];
  error$ = new BehaviorSubject<string>('');
  nlpText = '';
  nlpLoading = signal(false);
  nlpError = signal('');

  expenseService = inject(ExpenseService);
  router = inject(Router);

  constructor() {}

  ngOnInit() {
    this.expenseForm = new FormGroup({
      description: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
      ]),
      amount: new FormControl('', [Validators.required, Validators.min(0)]),
      category: new FormControl('', Validators.required),
      date: new FormControl(
        new Date().toISOString().split('T')[0],
        Validators.required
      ),
    });
  }

  get description() {
    return this.expenseForm.get('description');
  }

  get amount() {
    return this.expenseForm.get('amount');
  }

  get category() {
    return this.expenseForm.get('category');
  }

  get date() {
    return this.expenseForm.get('date');
  }

  reset(){
    this.expenseForm.get('description')?.reset();
    this.expenseForm.get('amount')?.reset();
    this.expenseForm.get('category')?.reset();
  }

  parseFromText() {
    if (!this.nlpText.trim()) return;
    this.nlpLoading.set(true);
    this.nlpError.set('');
    this.expenseService.parseExpense(this.nlpText).subscribe({
      next: ({ parsed }) => {
        this.expenseForm.patchValue({
          description: parsed.description,
          amount: parsed.amount,
          category: parsed.category,
          date: parsed.date ? parsed.date.split('T')[0] : new Date().toISOString().split('T')[0],
        });
        this.nlpText = '';
        this.nlpLoading.set(false);
      },
      error: (err) => {
        this.nlpError.set(err?.error?.message || 'Could not parse expense. Try being more specific.');
        this.nlpLoading.set(false);
      },
    });
  }

  onSubmit() {
    if (this.expenseForm.invalid) {
      return;
    }
    const expense = {
      description: this.expenseForm.value.description,
      amount: this.expenseForm.value.amount,
      category: this.expenseForm.value.category,
      date: new Date(this.expenseForm.value.date).toISOString(),
    };
    this.expenseService.addExpense(expense).subscribe({
      next: (res) => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error(err);
        this.error$.next(err?.error?.message || 'An error occurred');
      },
    });
  }
}
