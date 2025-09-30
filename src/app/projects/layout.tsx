interface Props {
  children: React.ReactNode;
};

const Layout = ({ children }: Props) => {
  return (
    <main>
      <div >{children}
      </div>
      </main>
)}

export default Layout;