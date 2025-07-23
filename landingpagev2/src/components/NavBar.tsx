import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, DollarSign } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 sticky-navbar border-b border-border">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-foreground">Yellow Dollar</span>
              <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                BETA
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" className="btn-hover">
                Sign In
              </Button>
              <Button className="btn-hover">
                Get Started
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="btn-hover"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in-up">
            <div className="flex flex-col space-y-4">
              <a 
                href="#pricing" 
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </a>
              <div className="flex flex-col space-y-2 pt-2">
                <Button variant="ghost" className="w-full justify-start btn-hover">
                  Sign In
                </Button>
                <Button className="w-full btn-hover">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;