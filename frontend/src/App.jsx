import React from "react-dom"
import { NavLink, Outlet } from "react-router-dom"
import 'bootstrap/dist/css/bootstrap.min.css';


// For navigation bar
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap'
import NavDropdown from 'react-bootstrap/NavDropdown';


function isActiveNavLink({ isActive }) {
  return {
    textDecoration: isActive ? "underline" : "none",
    fontWeight: isActive ? "bold" : "normal"
  }
}

export default function App() {
  return (
    <div>
      <Navbar bg="dark" variant="dark" className="me-auto" expand="lg" style={{
        paddingLeft: "2em",
        paddingRight: "2em",
      }}>
        <Container fluid>
          <LinkContainer to="/">
            <Navbar.Brand>Explore Biomedical Literature</Navbar.Brand>
          </LinkContainer>
            <Nav>
              <LinkContainer to="/">
                  <Nav.Link>Interactions Overview</Nav.Link>
              </LinkContainer>

              <NavDropdown title="Graphic Overview" id="basic-nav-dropdown">
              <LinkContainer to="/blob-viz-il6">
                  <NavDropdown.Item>Start from IL-6</NavDropdown.Item>
              </LinkContainer>
              <LinkContainer to="/blob-viz-tnf-fat">
                  <NavDropdown.Item>Start from TNF-FAT</NavDropdown.Item>
              </LinkContainer>
              </NavDropdown>


              <LinkContainer to="/evidence-index">
                  <Nav.Link>Search Evidence</Nav.Link>
              </LinkContainer>
              <LinkContainer to="/structured-search">
                  <Nav.Link>Structured Evidence Search</Nav.Link>
              </LinkContainer>
            </Nav>
        </Container>
      </Navbar>
      <div style={{
        margin: "0 1em 1em 1em"
      }}>
        <Outlet />
      </div>
    </div>
  )
}