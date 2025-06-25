import { render, screen } from '@testing-library/react';
import Button from './Button';
import { describe, it, expect } from 'vitest';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });
}); 