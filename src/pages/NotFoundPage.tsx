import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-gutter">
      <div className="flex flex-col items-center text-center max-w-[600px]">
        <h1 className="font-display text-[120px] text-primary/10 leading-none mb-sm">
          404
        </h1>
        <h2 className="font-headline-md text-headline-md text-primary mb-md">
          A Quiet Corner
        </h2>
        <p className="font-body-md text-body-md text-secondary mb-xl">
          The page you are looking for seems to have slipped out of the archive. 
          It might have been moved or perhaps it never existed.
        </p>
        <Link 
          to="/" 
          className="bg-primary text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:opacity-90 transition-opacity"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
