export default function Footer() {
  return (
    <footer className="py-6 border-t md:px-8 md:py-0 bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p className="text-sm leading-loose text-center text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} Traceback. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
