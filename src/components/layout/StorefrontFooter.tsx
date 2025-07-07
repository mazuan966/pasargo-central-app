import Link from 'next/link';

export function StorefrontFooter() {
    return (
        <footer className="flex items-center justify-center py-6 border-t bg-muted/40 mt-auto">
            <div className="container text-center">
                <p className="text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} Pasargo Central. All rights reserved.
                </p>
                <Link href="/admin/login" className="text-xs text-muted-foreground/50 hover:text-muted-foreground hover:underline">
                    Admin Portal
                </Link>
            </div>
        </footer>
    )
}
