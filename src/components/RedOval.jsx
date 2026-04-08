export default function RedOval({ children }) {
  return (
    <div className="border-4 border-red-500 rounded-full px-6 py-2 inline-block">
      {children}
    </div>
  );
}