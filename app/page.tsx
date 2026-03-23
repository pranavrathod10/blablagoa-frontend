export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">BlaBlaGoa</h1>
      <p className="text-lg text-gray-500 mb-8">
        Meet people nearby. Chat for 5 minutes.
      </p>
      <a
        href="/sign-in"
        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
      >
        Get Started
      </a>
    </main>
  );
}
