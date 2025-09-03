import { Link } from 'react-router-dom';

interface HeaderProps {
  title?: string;
}

export const Header = ({ title }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-gray-900">
              {title || 'Culqi Affiliation Demo'}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
