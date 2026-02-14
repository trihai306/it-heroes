import GridShape from "@/components/common/GridShape";
import { Link } from "react-router";
import PageMeta from "@/components/common/PageMeta";
import Button from "@/components/ui/button/Button";

export default function NotFound() {
  return (
    <>
      <PageMeta
        title="404 Not Found | IT Heroes"
        description="Page not found — IT Heroes Multi-Agent Platform"
      />
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1">
        <GridShape />
        <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
          <h1 className="mb-8 font-bold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl">
            ERROR
          </h1>

          <img src="/images/error/404.svg" alt="404" className="dark:hidden" />
          <img
            src="/images/error/404-dark.svg"
            alt="404"
            className="hidden dark:block"
          />

          <p className="mt-10 mb-6 text-base text-gray-700 dark:text-gray-400 sm:text-lg">
            We can't seem to find the page you are looking for!
          </p>

          <Link to="/">
            <Button variant="outline" size="md">
              Back to Home Page
            </Button>
          </Link>
        </div>
        <p className="absolute text-sm text-center text-gray-500 -translate-x-1/2 bottom-6 left-1/2 dark:text-gray-400">
          &copy; {new Date().getFullYear()} - IT Heroes
        </p>
      </div>
    </>
  );
}
