import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Link, FileText } from 'lucide-react';

const StickySearchBar = () => {
  const [activeTab, setActiveTab] = useState('text');
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-navbar border-t border-border sticky-navbar">
      <div className="container-custom py-4">
        <div className="max-w-4xl mx-auto">
          {/* Tab Buttons */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'text'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Analyze by Text</span>
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'url'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Link className="h-4 w-4" />
                <span>Analyze by URL</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex gap-3">
            <div className="flex-1">
              {activeTab === 'text' ? (
                <Input
                  placeholder="Paste YouTube Terms or Policy text here..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="h-12 text-base"
                />
              ) : (
                <Input
                  placeholder="Enter YouTube video URL..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="h-12 text-base"
                />
              )}
            </div>
            <Button size="lg" className="btn-hover h-12 px-8">
              <Search className="h-4 w-4 mr-2" />
              {activeTab === 'text' ? 'Free Scan' : 'Full Report'}
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="flex justify-center mt-4">
            <div className="flex items-center space-x-8 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>98.5% Accuracy</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>30s Analysis</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow rounded-full"></div>
                <span>Free to Start</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickySearchBar;