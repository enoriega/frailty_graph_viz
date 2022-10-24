import React from 'react';
import "./evidence_tagger_panel.css";
import { Button } from "react-bootstrap";

class EvidenceTaggerPanel extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newTagName: "",
            tags: Object.keys(props.labels),
            checks: Object.values(props.labels),
            addButtonDisabled: true
        }
    }

    validTagName(name) {
        // if the text field is empty, ignore the new tag
        if (name !== null && name !== "") {
            let tags = this.state.tags
            // If the tag is not already in the list (case insensitive search)
            if (!tags.map(t => t.toLowerCase()).includes(name.toLowerCase()))
                return true
        }

        return false
    }


    handleNewTagChange = (newTagName) => {
        // If the tag name is invalid, disable the button
        const addButtonDisabled = !this.validTagName(newTagName.trim())
        // Update the state, keeping track of the newTagname and addButtonDisabled
        this.setState({ newTagName: newTagName, addButtonDisabled: addButtonDisabled })
    }

    handleNewTagClick = () => {

        let newTag = this.state.newTagName.trim()

        if (this.validTagName(newTag)) {
            let tags = this.state.tags.slice()
            tags.push(newTag)
            let checks = this.state.checks.slice()
            checks.push(true)
            this.props.handleNewTag({ sentence: this.props.sentence, tagName: newTag })
            this.setState({ tags: tags, newTagName: "", addButtonDisabled: true, checks: checks })
            // Trigger the checks
            let newLabels = {};
            checks.forEach((value, ix) => newLabels[tags[ix]] = value);
            this.props.handleCheck({ sentence: this.props.sentence, tagName: newTag, checked: true });
        }

    }

    handleCheck = (ix) => {
        // Fetch the check marks
        let checks = this.state.checks.slice()
        // Toggle the appropriate check mark
        checks[ix] = !checks[ix]
        const checkHandler = this.props.handleCheck;
        let newLabels = {};
        checks.forEach((value, ix) => newLabels[this.state.tags[ix]] = value);
        checkHandler({ sentence: this.props.sentence, tagName: this.state.tags[ix], checked: checks[ix] });
        // Update the state
        this.setState({ checks: checks })
    }

    render = () => {
        // Instantiate the entries
        const tagElems = Array()
        for (let ix = 0; ix < this.state.tags.length; ++ix) {
            const tagName = this.state.tags[ix];
            const checked = this.state.checks[ix];

            tagElems.push(<EvidenceTag tagName={tagName}
                checked={checked}
                key={ix}
                onChange={() => this.handleCheck(ix)}
            />)
        }

        return (
            <div className="annotator-panel" onMouseEnter={this.props.handleMouseEnter} onMouseLeave={this.props.handleMouseLeave} style={{
                ...this.props.style,
                backgroundColor: "#bdbdb7"
            }}>
                <h4>Tag evidence</h4>
                <Button size="sm" variant="outline-dark" onClick={this.props.handleClose} style={{ position: "absolute", top: "10px", right: "10px" }}>X</Button>
                <ul>
                    {/* Render all the tag elements */}
                    {tagElems}
                    <NewEvidenceTag tagName={this.state.newTagName}
                        disabled={this.state.addButtonDisabled}
                        onChange={this.handleNewTagChange}
                        onClick={this.handleNewTagClick} />
                </ul>
            </div>
        );
    }
}

function EvidenceTag(props) {
    return (
        <li>
            <label>
                <input type="checkbox" checked={props.checked}
                    onChange={props.onChange}
                />
                {' ' + props.tagName}
            </label>
        </li>
    );
}

function NewEvidenceTag(props) {
    return (
        <li>
            <label>
                <input type="text"
                    value={props.tagName}
                    onChange={event => props.onChange(event.target.value)}
                    onKeyPress={
                        evt => {
                            if (evt.key === "Enter")
                                props.onClick()
                        }
                    }
                />
            </label>
            <Button size="sm" onClick={props.onClick} disabled={props.disabled}
                variant="secondary"
            >Add new</Button>
        </li>
    )
}

export default EvidenceTaggerPanel;